import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { RpcManager } from '../RpcManager';

describe('RPC remote discovery', () => {
    const manager = RpcManager as any;
    const originalGetServersCodePath = manager.getServersCodePath;
    let root: string;

    before(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'stone-rpc-test-'));
        const remotePath = path.join(root, 'demo', 'src', 'remote');
        fs.mkdirSync(remotePath, { recursive: true });
        fs.writeFileSync(path.join(remotePath, 'PlainRemote.js'), `
class BaseRemote { inherited() {} }
class Helper { unrelated() {} }
class PlainRemote extends BaseRemote {
    constructor() { super(); }
    log() {}
    async delayLog() {}
    static staticMethod() {}
    get state() { return 1; }
    set state(value) {}
    ['quoted']() {}
    field = () => {};
}
exports.PlainRemote = PlainRemote;
require('stone-missing-remote-dependency');
throw new Error('remote module executed during discovery');
`);
        fs.writeFileSync(path.join(remotePath, 'DecoratedRemote.js'), `
let DecoratedRemote = class DecoratedRemote {
    ping() {}
    static skip() {}
};
DecoratedRemote = decorate(DecoratedRemote);
exports.DecoratedRemote = DecoratedRemote;
throw new Error('decorated remote module executed during discovery');
`);
        fs.writeFileSync(path.join(remotePath, 'UnexportedRemote.js'), `
class UnexportedRemote { hidden() {} }
`);
        manager.getServersCodePath = () => root;
    });

    after(() => {
        manager.getServersCodePath = originalGetServersCodePath;
        manager._serverRemoteMap = undefined;
        if (path.dirname(path.resolve(root)) === path.resolve(os.tmpdir())) {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it('discovers own instance methods without executing remote modules', () => {
        manager._serverRemoteMap = undefined;
        const methods = manager.getRemoteInfo().get('demo');
        assert.deepStrictEqual(methods.get('PlainRemote'), ['log', 'delayLog', 'state', 'quoted']);
        assert.deepStrictEqual(methods.get('DecoratedRemote'), ['ping']);
        assert.strictEqual(methods.has('UnexportedRemote'), false);
    });
});
