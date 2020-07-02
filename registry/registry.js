
const http = require('http');

const backends = {};


http.createServer((req, res) => {
    console.info(req.url, req.headers['user-agent']);
    
    if (req.url.match(/^\/backends/)) {
        let browser = 'unknown';
        const userAgent = req.headers['user-agent'];
        if (userAgent.match(/Chrome\//)) {
            browser = 'chrome';
        }
        else if (userAgent.match(/Firefox\//)) {
            browser = 'firefox';
        }
        const browserBackends = {
            [browser + '*js']:   {key: browser + '*js', type: 'browser', config: 'js', alive: true},
            [browser + '*wasm']: {key: browser + '*wasm', type: 'browser', config: 'wasm', alive: true},
        };
        res.write(JSON.stringify(Object.assign(browserBackends, backends)));
    }
    else if (req.url.match(/^\/register/)) {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
            const backend = JSON.parse(data);
            backend.alive = true;
            console.info("added backend", backend.key, data);
            backends[backend.key] = backend;
        });
    }
    else {
        res.write("bad path");
    }
    res.end();
}).listen(44000);


const checkBackends = () => {
    Object.values(backends).forEach(backend => {
        http.get(`http://${backend.host}:${backend.port}/ping`, {timeout: 800}, res => {
            if (res.code === 200 && !backend.alive) {
                console.info("backend online:", backend.key);
                backend.alive = true;
            }
            if (res.code !== 200 && backend.alive) {
                console.info("backend offline:", backend.key);
                backend.alive = false;
            }
        }).on('error', e => {
            if (backend.alive) {
                console.info("backend offline:", backend.key);
                backend.alive = false;
            }
        });
    });
};


setInterval(checkBackends, 1000);
