'use strict';

import childProcess from 'node:child_process'
import clear from 'clear'
import { watch } from 'chokidar';
import ora from 'ora';

class ServerlessWatchPlugin {
    constructor(serverless, cliOptions, { log }) {
        this.log = log
        this.cliOptions = cliOptions
        this.serverless = serverless
        this.serverless.cli['log'] = () => {}
        this.serviceDir = serverless.config.serviceDir

        this.watchPaths = []
        this.watchFunctions = []
        this.slsOptions = []

        this.cliInterface = {
            spinner: ora({
                text: 'Watching for changes',
                spinner: 'dots',
                color: 'yellow'
            }),
        }

        this.hooks = {
            'watch:start': this.start.bind(this),
            initialize: this.init.bind(this)
        }

        this.commands = {
            'watch': {
                usage: 'Watch and deploy your functions',
                lifecycleEvents: ['start'],
                options: {
                    function: {
                        type: 'string',
                        usage: 'The function you want to watch',
                        shortcut: 'f'
                    },
                    config: {
                        type: 'string',
                        usage: 'Path to serverless config file',
                        shortcut: 'c'
                    },
                    stage: {
                        type: 'string',
                        usage: 'Specify the stage to use',
                        shortcut: 's'
                    }
                }
            }
        }
    }

    setupWatch() {
        const functions = this.serverless.configurationInput.functions
        
        if (!this.cliOptions['function']) {
            for (const func of Object.keys(functions)) {
                this.watchFunctions.push(func)
                this.watchPaths.push(this.getPathFromFunction(func)) 
            }
        }
    
        if (this.cliOptions['function']) {
            const fn = this.cliOptions['function']
            if (!functions[fn])  throw new Error(`Function ${fn} not found`);
    
            this.watchFunctions.push(fn)
            this.watchPaths.push(this.getPathFromFunction(fn))
        }

        if (this.cliOptions.config) {
            this.watchPaths.push(this.cliOptions.config)
        } else {
            this.watchPaths.push(`${this.serviceDir}/${this.serverless.configurationFilename}`)
        }
    
        if (this.serverless.service.custom.serverlessWatch.includes) {
            this.watchPaths = [
                ...this.watchPaths, 
                ...this.serverless.service.custom.serverlessWatch.includes
            ]
        }
    }

    setupServerlessOptions() {
        for (const command of Object.keys(this.cliOptions)) {
            if (['stage', 'config', 'function', 'verbose'].includes(command)) {
                this.slsOptions.push(`--${command}`, this.cliOptions[command])
            }
        }
    }

    init() {
        this.setupWatch()
        this.setupServerlessOptions()
    }

    getPathFromFunction(func) {
        const functions = this.serverless.configurationInput.functions
        let handlerPath = functions[func].handler.split('.')[0]
        return this.serviceDir + '/' + handlerPath
    }

    getFunctionByPath(path) {
        const functions = this.serverless.configurationInput.functions

        for (const func of Object.keys(functions)) {
            const funcPath = functions[func].handler.split('.')[0]
            if (path.includes(funcPath)) {
                return func
            }
        }
        
        return null
    }

    async setCli() {
        clear()

        const cliSpinner = this.cliInterface.spinner
        cliSpinner.text = 'Watching for changes'
        cliSpinner.color = 'yellow'
        cliSpinner.start()
    }

    async deployFunction(path) {
        const cliSpinner = this.cliInterface.spinner

        try {
            const functionToDeploy = this.getFunctionByPath(path)

            // Set the option function to deploy
            this.cliOptions['force'] = true
            this.cliOptions['function'] = functionToDeploy
            this.cliOptions['update-config'] = false
            
            cliSpinner.succeed(`Deploying function ${functionToDeploy}. See logs for details`)
            await this.serverless.pluginManager.spawn('deploy:function')
        } catch (e) {
            this.log.error(e.message)
        }
    }

    deployService() {
        const cliSpinner = this.cliInterface.spinner
        cliSpinner.succeed('Deploying service. See logs for details')

        const cmdArray = ['deploy', '--force', ...this.slsOptions]
        childProcess.execFileSync('serverless', cmdArray, { stdio: 'inherit' })
    }

    async deployAllFunctions() {
        const cliSpinner = this.cliInterface.spinner
        cliSpinner.succeed('Deploying all functions. See logs for details')

        const functions = this.serverless.configurationInput.functions
        const functionsToDeploy = []

        for (const func of Object.keys(functions)) {
            functionsToDeploy.push(async () => {
                this.cliOptions['function'] = func
                this.cliOptions['force'] = true
                this.cliOptions['update-config'] = false
                await this.serverless.pluginManager.spawn('deploy:function')
            })
        }

        await Promise.all(functionsToDeploy.map((func) => func()))
    }

    async updateService(path) {
        if (this.getFunctionByPath(path)) {
            await this.deployFunction(path)
        } else if (path.includes(this.serverless.configurationFilename)) {
            this.deployService()
        } else {
            await this.deployAllFunctions()
        }
    }

    async start() {
        clear()
        this.cliInterface.spinner.start()

        watch(this.watchPaths).on('change', async (path) => {
            await this.updateService(path)
            await this.setCli()
        })
    }
}

export default ServerlessWatchPlugin;