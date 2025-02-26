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
}
exports.CommonUtils = CommonUtils;
//# sourceMappingURL=CommonUtils.js.map