"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonUtils = void 0;
const fs = require("fs");
const path = require("path");
class CommonUtils {
    static getAllFiles(dirPath, fileList = []) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const isDirectory = fs.statSync(filePath).isDirectory();
            if (isDirectory) {
                this.getAllFiles(filePath, fileList);
            }
            else {
                if (!file.startsWith('.')) { // 过滤掉隐藏的文件和目录
                    fileList.push(filePath);
                }
            }
        }
        return fileList;
    }
    static firstCharToUpperCase(str) {
        return str.charAt(0).toUpperCase() + str.substring(1);
    }
    static firstCharToLowerCase(str) {
        return str.charAt(0).toLocaleLowerCase() + str.substring(1);
    }
    static formatMemory(bytes) {
        return (bytes / 1024 / 1024).toFixed(2);
    }
    static getParams(params, target) {
        const result = target || {};
        for (let index = 0; index < params.length; index++) {
            const arg = params[index];
            const kvInfo = arg.split('=');
            const key = kvInfo[0];
            const value = kvInfo[1];
            result[key] = CommonUtils.tryGetStartParamValue(value);
        }
        return result;
    }
    static tryGetStartParamValue(value) {
        if (value === 'true' || value === 'false') {
            return value === 'true';
        }
        const num = Number(value);
        return Number.isNaN(num) ? value : num;
    }
}
exports.CommonUtils = CommonUtils;
//# sourceMappingURL=CommonUtils.js.map