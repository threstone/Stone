export class BaseClass {
    static ins<T extends {}>(this: new (...args: any[]) => T, ...args: any[]): T {
        let cls: any = this;
        if (!cls._instance) {
            cls._instance = new cls(...args);
        }
        return cls._instance;
    }
}