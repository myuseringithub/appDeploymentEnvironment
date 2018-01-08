import path from 'path'
const filesystem = require('fs')
const { spawn, spawnSync } = require('child_process')
const configuration = require('../setup/configuration/configuration.export.js')

// Log environment variables & shell command arguments
console.log('• entrypointConfigurationPath:' + process.env.entrypointConfigurationPath)
console.log('• entrypointOption:' + process.env.entrypointOption)
process.argv = process.argv.slice(2)

// managed webapp root folder
const configurationFilename = 'configuration.js'
const managedAppFolder = configuration.directory.managedApplicationRootFolder //project folder
const managedAppDefault = {
    configurationFolderPath: path.join(managedAppFolder, `application/setup/configuration`),
    entrypointFolderPath: path.join(managedAppFolder, `application/setup/entrypoint`),
}

// set entrypoint option/command
let entrypointName;
if(process.argv[0]) {
    console.log(`Arguments passed: ${process.argv.toString()}`)
    entrypointName = process.argv.shift() // update global argv
} else {
    entrypointName = process.env.entrypointOption
}

// Set entrypoint configuration path
let entrypointConfigList, absolutePath;
if(process.env.entrypointConfigurationPath) {
    absolutePath = process.env.entrypointConfigurationPath
    entrypointConfigList = require(absolutePath)
} else {
    // if entrypoint object exists inside './application/setup/configuration/configuration.js'
    if(filesystem.existsSync(`${managedAppDefault.configurationFolderPath}/${configurationFilename}`) && require(`${managedAppDefault.configurationFolderPath}/${configurationFilename}`)['entrypoint']) {
        absolutePath = `${managedAppDefault.configurationFolderPath}/${configurationFilename}`
        entrypointConfigList = require(absolutePath)['entrypoint']
    } else if(filesystem.existsSync(`${managedAppDefault.entrypointFolderPath}/${configurationFilename}`)) { // else choose './application/setup/etnrypoint/configuration.js'
        absolutePath = `${managedAppDefault.entrypointFolderPath}/${configurationFilename}`
        entrypointConfigList = require(absolutePath)
    }
}
console.log(`• Choosen entrypoint configuration path: ${absolutePath}`)

// get specific entrypoint option object
let entrypointConfig = entrypointConfigList[entrypointName] || null

if(entrypointConfig) {

    let modulePath // entrypoint module path
    if(entrypointConfig['file']) {
        if(path.isAbsolute(entrypointConfig['file'])) { // check if relative path or absolute.
            modulePath = entrypointConfig['file']
        } else {
            modulePath = path.join(managedAppFolder, entrypointConfig['file'])
        }
    } else {
        // default entrypoint file location if no file path present in configuration file.
        modulePath = path.join(managedAppDefault.entrypointFolderPath, `${entrypointName}`) // .js file or folder module.
    }
    
    // install node_modules if not present in case a folder is being passed.
    // ISSUE - installing node_modules of and from within running module, will fail to load the newlly created moduules as node_modules path was already read by the nodejs application.
    function installModule({ currentDirectory }) { spawnSync('yarn', ["install --pure-lockfile --production=false"], { cwd: currentDirectory, shell: true, stdio:[0,1,2] }) }
    let directory;
    // Check if javascript module is a module file or directory module.
    if(filesystem.existsSync(modulePath) && filesystem.lstatSync(modulePath).isDirectory()) {
        directory = modulePath
    } else if(filesystem.existsSync(`${modulePath}.js`) || filesystem.existsSync(modulePath) && filesystem.lstatSync(modulePath).isFile()) {
        directory = modulePath.substr(0, modulePath.lastIndexOf("/"))
    }
    // install modules
    let isNodeModuleInstallExist = filesystem.existsSync(`${directory}/node_modules`)
    if (!isNodeModuleInstallExist) {
        installModule({ currentDirectory: directory })
    }
    
    try {
        require(modulePath)
    } catch (error) {
        throw error
    }

} else {
    console.log(`Reached switch default - "${entrypointName}" entrypointOption does not match any case/kind/option`)
    console.log(entrypointConfigList)
    // var docker = new Docker({socketPath: '/var/run/docker.sock'})
    // var container = docker.getContainer('4ba04235356e8f07d16f2bd2d4aa351a97d50eb3775d7043b63a29861412735a');
    // container.inspect(function (err, data) {
    //     console.log(data);
    // });
}