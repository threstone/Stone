copy /y stone .\publish\ 
copy /y stone.cmd .\publish\ 
copy /y package.json .\publish\ 
tsc -p tsconfig_dist.json
