import * as fs from 'fs';
import * as path from 'path';
export class CommonUtils {
    static getAllFiles(dirPath: string, fileList: string[] = []) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const isDirectory = fs.statSync(filePath).isDirectory();
            if (isDirectory) {
                this.getAllFiles(filePath, fileList);
            } else {
                if (!file.startsWith('.')) { // 过滤掉隐藏的文件和目录
                    fileList.push(filePath);
                }
            }
        }
        return fileList;
    }

    static firstCharToUpperCase(str: string) {
        return str.charAt(0).toUpperCase() + str.substring(1);
    }

    static firstCharToLowerCase(str: string) {
        return str.charAt(0).toLocaleLowerCase() + str.substring(1);
    }

    static formatMemory(bytes: number) {
        return (bytes / 1024 / 1024).toFixed(2);
    }

    static getParams(params: string[], target?: any) {
        const result = target || {};
        for (let index = 0; index < params.length; index++) {
            const arg = params[index];
            const kvInfo = arg.split('=');
            const key: string = kvInfo[0];
            const value: string | number = kvInfo[1];
            result[key] = CommonUtils.tryGetStartParamValue(value);
        }
        return result;
    }

    static tryGetStartParamValue(value: string) {
        if (value === 'true' || value === 'false') {
            return value === 'true';
        }

        const num = parseInt(value, 10);
        return Number.isNaN(num) ? value : num;
    }
}