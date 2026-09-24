const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('grep -o -E ".{0,60}pemkocaufntsbicnzziz.{0,60}" domains/recargasjuegospro.cloud/public_html/assets/index-svzR1cq6.js', (err, stream) => {
    let out = '';
    stream.on('data', d => out += d);
    stream.on('close', () => {
      console.log('Match index-svzR1cq6.js:\n' + out);
      conn.exec('grep -o -E ".{0,60}recargasjuegospro.cloud.{0,60}" domains/recargasjuegospro.cloud/public_html/assets/index-svzR1cq6.js', (err2, stream2) => {
        let out2 = '';
        stream2.on('data', d => out2 += d);
        stream2.on('close', () => {
          console.log('Match domain in index:\n' + out2);
          conn.end();
        });
      });
    });
  });
}).connect({
  host: '151.106.96.74', port: 65002, username: 'u181179691', password: '#RyuuDragon9595'
});
