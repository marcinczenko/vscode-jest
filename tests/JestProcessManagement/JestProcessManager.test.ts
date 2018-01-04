jest.unmock('../../src/JestProcessManagement/JestProcessManager')

import { ProjectWorkspace } from 'jest-editor-support'
import { JestProcess } from '../../src/JestProcessManagement/JestProcess'
import { JestProcessManager } from '../../src/JestProcessManagement/JestProcessManager'
import { EventEmitter } from 'events'

describe('JestProcessManager', () => {
  let jestProcessManager
  let projectWorkspaceMock
  let exitHandler
  let eventEmitter

  const jestProcessMock = (JestProcess as any) as jest.Mock<any>

  beforeEach(() => {
    jest.clearAllMocks()
    projectWorkspaceMock = new ProjectWorkspace(null, null, null, null)
    jestProcessManager = new JestProcessManager({ projectWorkspace: projectWorkspaceMock })
    exitHandler = jest.fn()
    eventEmitter = new EventEmitter()
  })

  describe('when creating', () => {
    it('accepts Project Workspace as the argument', () => {
      const jestProcessManager = new JestProcessManager({ projectWorkspace: projectWorkspaceMock })
      expect(jestProcessManager).not.toBe(null)
    })
  })

  describe('when starting jest process', () => {
    it('creates JestProcess', () => {
      jestProcessManager.startJestProcess()

      expect(jestProcessMock.mock.instances.length).toBe(1)
    })

    it('returns an instance of JestProcess', () => {
      const jestProcess = jestProcessManager.startJestProcess()

      expect(jestProcess).toBe(jestProcessMock.mock.instances[0])
    })

    it('passes the project workspace to the JestProcess instance', () => {
      jestProcessManager.startJestProcess()

      expect(jestProcessMock.mock.calls[0][0]).toHaveProperty('projectWorkspace', projectWorkspaceMock)
    })

    it('calls the onExit handler when JestProcess exits', () => {
      const mockImplementation = {
        keepAlive: false,
        onExit: callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        },
      }
      jestProcessMock.mockImplementation(() => mockImplementation)

      jestProcessManager.startJestProcess({ exitCallback: exitHandler })

      eventEmitter.emit('debuggerProcessExit', mockImplementation)

      expect(exitHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('when starting jest process in non-watch mode', () => {
    it('passes the watchMode flag set to false', () => {
      jestProcessManager.startJestProcess()

      expect(jestProcessMock.mock.calls[0][0]).toHaveProperty('watchMode', false)
    })
  })

  describe('when starting jest process in keep-alive mode', () => {
    it('passes the keepAlive flag set to true', () => {
      jestProcessManager.startJestProcess({ keepAlive: true })

      expect(jestProcessMock.mock.calls[0][0]).toHaveProperty('keepAlive', true)
    })
  })

  describe('when starting jest process in non keep-alive mode', () => {
    it('passes the keepAlive flag set to false', () => {
      jestProcessManager.startJestProcess({ keepAlive: false })

      expect(jestProcessMock.mock.calls[0][0]).toHaveProperty('keepAlive', false)
    })

    it('passes the keepAlive flag set to false when no flag is specified', () => {
      jestProcessManager.startJestProcess()

      expect(jestProcessMock.mock.calls[0][0]).toHaveProperty('keepAlive', false)
    })
  })

  describe('when starting jest process in watch mode', () => {
    it('creates two jest processes: one to run all the tests and one for the watch mode', () => {
      jestProcessMock.mockImplementation(() => ({
        onExit: callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        },
      }))

      jestProcessManager.startJestProcess({ watch: true })

      eventEmitter.emit('debuggerProcessExit')

      expect(jestProcessMock.mock.instances.length).toBe(2)
    })

    it('first runs all the tests in non-watch mode and then spins jest process in watch mode', () => {
      jestProcessMock.mockImplementation(() => ({
        onExit: callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        },
      }))

      jestProcessManager.startJestProcess({ watch: true })

      eventEmitter.emit('debuggerProcessExit')

      expect(jestProcessMock.mock.calls[0][0]).toHaveProperty('watchMode', false)
      expect(jestProcessMock.mock.calls[1][0]).toHaveProperty('watchMode', true)
    })

    it('starts the process for non-watch mode with keep-alive flag set to false', () => {
      jestProcessMock.mockImplementation(() => ({
        onExit: callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        },
      }))

      jestProcessManager.startJestProcess({ watch: true, keepAlive: true })

      // we need this to trigger the watch-mode process that only starts
      // after the non-watch-mode process exits
      eventEmitter.emit('debuggerProcessExit')

      expect(jestProcessMock.mock.calls[0][0]).toHaveProperty('keepAlive', false)
      expect(jestProcessMock.mock.calls[1][0]).toHaveProperty('keepAlive', true)
    })

    it('starts both jest processes with the same project workspace', () => {
      jestProcessMock.mockImplementation(() => ({
        onExit: callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        },
      }))

      jestProcessManager.startJestProcess({ watch: true })

      eventEmitter.emit('debuggerProcessExit')

      expect(jestProcessMock.mock.calls[0][0]).toHaveProperty('projectWorkspace', projectWorkspaceMock)
      expect(jestProcessMock.mock.calls[1][0]).toHaveProperty('projectWorkspace', projectWorkspaceMock)
    })

    it('binds the provided exit handler to the both jest processes', () => {
      const eventEmitterForWatchMode = new EventEmitter()
      const onExitMock = jest
        .fn()
        .mockImplementationOnce(callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        })
        .mockImplementationOnce(callback => {
          eventEmitterForWatchMode.on('debuggerProcessExit', callback)
        })

      jestProcessMock.mockImplementation(() => ({
        onExit: onExitMock,
      }))

      jestProcessManager.startJestProcess({ watch: true, exitCallback: exitHandler })

      eventEmitter.emit('debuggerProcessExit', { watchMode: false })
      eventEmitterForWatchMode.emit('debuggerProcessExit', { watchMode: true })

      expect(exitHandler).toHaveBeenCalledTimes(2)
      expect(exitHandler.mock.calls[0][0].watchMode).toBe(false)
      expect(exitHandler.mock.calls[1][0].watchMode).toBe(true)
    })

    it('the exit handler for the non-watch mode passes the jest process representing the watch mode as the second argument', () => {
      const eventEmitterForWatchMode = new EventEmitter()
      const onExitMock = jest
        .fn()
        .mockImplementationOnce(callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        })
        .mockImplementationOnce(callback => {
          eventEmitterForWatchMode.on('debuggerProcessExit', callback)
        })

      let mockImplementation = {
        onExit: onExitMock,
        restart: jest.fn(),
      }

      jestProcessMock.mockImplementation(() => mockImplementation)

      jestProcessManager.startJestProcess({ watch: true, exitCallback: exitHandler })

      eventEmitter.emit('debuggerProcessExit', mockImplementation)
      eventEmitterForWatchMode.emit('debuggerProcessExit', mockImplementation)

      expect(exitHandler.mock.calls[0].length).toBe(2)
      expect(exitHandler.mock.calls[0][1]).toBe(mockImplementation)
    })
  })

  describe('when stopping jest process', () => {
    it('stops the most recent running jest process', () => {
      const stopMock = jest.fn()
      jestProcessMock.mockImplementation(() => ({
        onExit: jest.fn(),
        stop: stopMock,
      }))
      jestProcessManager.startJestProcess()

      jestProcessManager.stopJestProcess()

      expect(stopMock).toHaveBeenCalledTimes(1)
    })

    // jest mocking does not let us test it properly because
    // jestProcessMock.instances does not work as expected
    it('only stops the most recent jest process', () => {
      const mockImplementation = {
        onExit: jest.fn(),
        stop: jest.fn(),
      }

      jestProcessMock.mockImplementation(() => mockImplementation)

      jestProcessManager.startJestProcess()
      jestProcessManager.startJestProcess()

      jestProcessManager.stopJestProcess()

      expect(jestProcessMock.mock.instances.length).toBe(2)
      expect(mockImplementation.stop).toHaveBeenCalledTimes(1)
    })

    it('does not stops jest process if none is running', () => {
      const mockImplementation = {
        onExit: jest.fn(),
        stop: jest.fn(),
      }

      jestProcessMock.mockImplementation(() => mockImplementation)

      jestProcessManager.stopJestProcess()

      expect(jestProcessMock.mock.instances.length).toBe(0)
      expect(mockImplementation.stop).not.toHaveBeenCalled()
    })
  })

  describe('jest process exits with keepAlive === true', () => {
    it('removes the reference to the jest process that has been stopped', () => {
      jestProcessManager.startJestProcess({ keepAlive: true })

      jestProcessManager.stopJestProcess()

      expect(jestProcessManager.numberOfProcesses).toBe(0)
    })

    it('removes the reference to the jest process that has been stopped and the following onExit event does not do anything', () => {
      jestProcessMock.mockImplementation(() => ({
        keepAlive: true,
        onExit: callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        },
        stop: jest.fn(),
      }))

      const jestProcess = jestProcessManager.startJestProcess({ keepAlive: true })
      jestProcessManager.stopJestProcess()

      eventEmitter.emit('debuggerProcessExit', jestProcess)

      expect(jestProcessManager.numberOfProcesses).toBe(0)
      expect(jestProcess.stop).toHaveBeenCalledTimes(1)
    })

    it('keeps the reference to the jest process that exited on its own but then restarted', () => {
      jestProcessMock.mockImplementation(() => ({
        keepAlive: true,
        onExit: callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        },
      }))

      const jestProcess = jestProcessManager.startJestProcess({ keepAlive: true })

      eventEmitter.emit('debuggerProcessExit', jestProcess)

      expect(jestProcessManager.numberOfProcesses).toBe(1)
    })

    it('removes the reference to the jest process that exited on its own that preceeds the jest process for watch mode', () => {
      jestProcessMock.mockImplementation(() => ({
        onExit: callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        },
      }))

      const jestProcess = jestProcessManager.startJestProcess({ watch: true, keepAlive: true })

      eventEmitter.emit('debuggerProcessExit', jestProcess)

      expect(jestProcessManager.numberOfProcesses).toBe(1)
    })

    it('keeps the reference to the jest process in watch-mode that exited on its own', () => {
      const eventEmitterForWatchMode = new EventEmitter()
      const onExitMock = jest
        .fn()
        .mockImplementationOnce(callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        })
        .mockImplementationOnce(callback => {
          eventEmitterForWatchMode.on('debuggerProcessExit', callback)
        })

      let mockImplementation = {
        keepAlive: true,
        onExit: onExitMock,
        restart: jest.fn(),
      }
      jestProcessMock.mockImplementation(() => mockImplementation)

      const jestProcess = jestProcessManager.startJestProcess({
        watch: true,
        keepAlive: true,
        exitCallback: (_, jestProcessInWatchMode) => {
          if (jestProcessInWatchMode) {
            // this one will exit the watch-mode process
            eventEmitterForWatchMode.emit('debuggerProcessExit', jestProcessInWatchMode)
          }
        },
      })

      // this one will exit the run-all-tests process
      eventEmitter.emit('debuggerProcessExit', jestProcess)

      // there should be one process left - the watch mode process is kept-alive
      expect(jestProcessManager.numberOfProcesses).toBe(1)
    })
  })

  describe('jest process exits with keepAlive === false', () => {
    it('removes the reference to the jest process that exited on its own', () => {
      jestProcessMock.mockImplementation(() => ({
        keepAlive: false,
        onExit: callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        },
        restart: jest.fn(),
      }))

      const jestProcess = jestProcessManager.startJestProcess()

      eventEmitter.emit('debuggerProcessExit', jestProcess)

      expect(jestProcessManager.numberOfProcesses).toBe(0)
    })

    it('removes the reference to the jest process in watch-mode that exited on its own', () => {
      const eventEmitterForWatchMode = new EventEmitter()
      const onExitMock = jest
        .fn()
        .mockImplementationOnce(callback => {
          eventEmitter.on('debuggerProcessExit', callback)
        })
        .mockImplementationOnce(callback => {
          eventEmitterForWatchMode.on('debuggerProcessExit', callback)
        })

      let mockImplementation = {
        keepAlive: false,
        onExit: onExitMock,
        restart: jest.fn(),
      }
      jestProcessMock.mockImplementation(() => mockImplementation)

      const jestProcess = jestProcessManager.startJestProcess({
        watch: true,
        exitCallback: (_, jestProcessInWatchMode) => {
          if (jestProcessInWatchMode) {
            eventEmitterForWatchMode.emit('debuggerProcessExit', jestProcessInWatchMode)
          }
        },
      })

      eventEmitter.emit('debuggerProcessExit', jestProcess)

      expect(jestProcessManager.numberOfProcesses).toBe(0)
    })
  })
})