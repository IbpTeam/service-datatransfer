var tunnels = [],
    peer = require('./peer');

exports.parse = function(channel, msg) {
  console.log('tunnel parse:', msg)
  switch(msg[0]) {
    case '0': // ConnPeer
      peer.instance().peerStream(msg[1], function(err, peerChannel) {
        if(err) return channel.write('0:ERROR-' + err);
        peerChannel.id = channel.id;
        tunnels[channel.id].push(peerChannel);
        peerChannel.write('1:' + channel.id);
        channel.write('0:OK:' + channel.id);
      });
      break;
    case '1': // SetID
      if(typeof tunnels[channel.id] === 'undefined') {
        channel.id = msg[1];
        tunnels[channel.id] = [channel];
        return ;
      }
      tunnels[msg[1]] = tunnels[channel.id];
      tunnels[channel.id] = null;
      delete tunnels[channel.id];
      for(var i = 0; i < tunnels[msg[1]].length; ++i) {
        tunnels[msg[1]][i].id = msg[1];
      }
      break;
    case '2': // get throuth the tunnel based on tunnelID
      if(typeof tunnels[msg[1]] === 'undefined') {
        return channel.write('2:' + 'tunnel is not found');
      }
      tunnels[msg[1]].push(channel);
      var tunnel = tunnels[msg[1]];
      if(tunnel.length < 2)
        return channel.write('2:' + 'not enough channel of this tunnel');
      tunnel[0].on('data', function(chuck) {
        tunnel[1].write(chuck);
      }).on('error', function(err) {
        console.log(this.id, ' src [ERROR]:', err);
      });
      tunnel[1].on('data', function(chuck) {
        tunnel[0].write(chuck);
      }).on('error', function(err) {
        console.log(this.id, ' dst [ERROR]:', err);
      });
      channel.write('2:OK');
      break;
    default:
      break;
  }
}

exports.tunnelInsert = function(id, newTunnel) {
  tunnels[id] = newTunnel;
}

exports.tunnelProlong = function(id, channel) {
  if(typeof tunnels[id] === 'undefined')
    tunnels[id] = [];
  tunnels[id].push(channel);
}

