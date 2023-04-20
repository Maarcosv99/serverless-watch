'use strict'

import { execFileSync } from 'node:child_process'
import { watch } from 'chokidar'
import ora from 'ora'

const clear = () => execFileSync('clear', { stdio: 'inherit' })

class ServerlessWatchPlugin {
    constructor(serverless, cliOptions) {
        this.cliOptions = cliOptions
        this.serverless = serverless

        this.watchPaths = []
        this.deployOptions = []
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

    getPathFromFunction(funcName) {
        const { functions } = this.serverless.configurationInput
        const { serviceDir } = this.serverless.config
        let handlerPath = functions[funcName].handler.split('.')[0]
        return serviceDir + '/' + handlerPath
    }

    getFunctionByPath(path) {
        const { functions } = this.serverless.configurationInput
        const fn = Object.entries(functions).find(([_, { handler }]) => {
            return path.includes(handler.split('.')[0])
        })
        return fn ? fn[0] : null
    }

    setupWatchAllFunctions() {
        if (!this.cliOptions['function']) {
            const { functions } = this.serverless.configurationInput
            Object.keys(functions).forEach(func => {
                this.watchPaths.push(this.getPathFromFunction(func)) 
            })
        }
    }

    setupWatchSingleFunction() {
        if (this.cliOptions['function']) {
            const fn = this.cliOptions['function']
            const { functions } = this.serverless.configurationInput
            if (!functions[fn])  throw new Error(`Function ${fn} not found`);
            this.watchPaths.push(this.getPathFromFunction(fn))
        }
    }

    setupWatchServerlessConfig() {
        const { serviceDir } = this.serverless.config
        const { configurationFilename } = this.serverless

        if (this.cliOptions.config) {
            this.watchPaths.push(this.cliOptions.config)
        } else {
            this.watchPaths.push(`${serviceDir}/${configurationFilename}`)
        }
    }

    setupWatchCustomConfig() {
        const { serverlessWatch } = this.serverless.service.custom
        if (serverlessWatch && serverlessWatch.includes) {
            this.watchPaths = [...this.watchPaths, ...serverlessWatch.includes]
        }
    }

    setupWatch() {
        this.setupWatchAllFunctions()
        this.setupWatchSingleFunction()
        this.setupWatchServerlessConfig()
        this.setupWatchCustomConfig()
    }

    setupDeployOptions() {
        this.deployOptions = Object.entries(this.cliOptions).reduce((options, command) => {
            options.push(`--${command[0]}`, command[1])
            return options
        }, [])
    }

    init() {
        this.setupWatch()
        this.setupDeployOptions()
    }

    setCli() {
        clear()
        const { spinner } = this.cliInterface
        spinner.text = 'Watching for changes'
        spinner.color = 'yellow'
        spinner.start()
    }

    async spawnDeployFunction(fn_to_deploy) {
        // Set cli options to deploy function
        this.cliOptions['force'] = true
        this.cliOptions['update-config'] = false
        this.cliOptions['function'] = fn_to_deploy

        await this.serverless.pluginManager.spawn('deploy:function')
    }

    spawnDeployService() {
        const cmdArray = ['deploy', '--force', ...this.deployOptions]
        execFileSync('serverless', cmdArray, { stdio: 'inherit' })
    }

    async deployFunction(path) {
        const { spinner } = this.cliInterface
        const functionToDeploy = this.getFunctionByPath(path)
        spinner.succeed(`Deploying function ${functionToDeploy}. See logs for details`)
        await this.spawnDeployFunction(functionToDeploy)
    }

    async deployAllFunctions() {
        const { spinner } = this.cliInterface
        spinner.succeed('Deploying all functions. See logs for details')
        const { functions } = this.serverless.configurationInput
        for (const func of Object.keys(functions)) {
            await this.spawnDeployFunction(func)
        }
    }

    deployService() {
        const { spinner } = this.cliInterface
        spinner.succeed('Deploying service. See logs for details')
        this.spawnDeployService()
    }

    async deployManager(path) {
        if (this.getFunctionByPath(path)) {
            await this.deployFunction(path)
        } else if (path.includes(this.serverless.configurationFilename)) {
            this.deployService()
        } else {
            await this.deployAllFunctions()
        }
    }

    async start() {
        this.setCli()
        watch(this.watchPaths).on('change', async (path) => {
            await this.deployManager(path)
            this.setCli()
        })
    }
}

export default ServerlessWatchPlugin;