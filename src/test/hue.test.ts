import assert from 'node:assert/strict';
import { mock } from 'node:test';
import * as vscode from 'vscode';
import { Hue } from '../hue';
import { Lantern } from '../lantern';
import { logger } from '../logger';

suite('Hue response validation', () => {
  let hue: Hue;
  let previousBridgeIp: string | undefined;
  let previousUsername: string | undefined;

  setup(async () => {
    const config = vscode.workspace.getConfiguration('lantern');
    previousBridgeIp = config.inspect<string>('hueBridgeIp')?.globalValue;
    previousUsername = config.inspect<string>('hueUsername')?.globalValue;
    await config.update('hueBridgeIp', '192.0.2.1', vscode.ConfigurationTarget.Global);
    await config.update('hueUsername', 'test-username', vscode.ConfigurationTarget.Global);
    hue = new Hue();
  });

  teardown(async () => {
    mock.restoreAll();
    const config = vscode.workspace.getConfiguration('lantern');
    await config.update('hueBridgeIp', previousBridgeIp, vscode.ConfigurationTarget.Global);
    await config.update('hueUsername', previousUsername, vscode.ConfigurationTarget.Global);
  });

  test('discovers bridges from valid API responses', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      Response.json([{ internalipaddress: '192.0.2.1', id: 'bridge-id' }]),
    );

    assert.deepEqual(await hue.discoverBridges(), [{ ip: '192.0.2.1' }]);
    assert.equal(fetchMock.mock.calls[0].arguments[0], 'https://discovery.meethue.com/');
  });

  test('an empty discovery response is valid', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json([]));
    const errorMock = mock.method(logger, 'error', () => {});

    assert.deepEqual(await hue.discoverBridges(), []);
    assert.equal(errorMock.mock.callCount(), 0);
  });

  for (const data of [{}, [{ internalipaddress: 42 }]]) {
    test(`logs malformed discovery responses: ${JSON.stringify(data)}`, async () => {
      mock.method(globalThis, 'fetch', async () => Response.json(data));
      const errorMock = mock.method(logger, 'error', () => {});

      assert.deepEqual(await hue.discoverBridges(), []);
      assert.equal(errorMock.mock.calls[0].arguments[0], 'Failed to discover Hue bridges');
      assert.deepEqual(errorMock.mock.calls[0].arguments[1], new Error('Invalid Hue bridge discovery response'));
    });
  }

  test('creates and saves a user from a successful API response', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      Response.json([{ success: { username: 'created-username' } }]),
    );

    assert.equal(await hue.createUser('192.0.2.2'), 'created-username');
    const config = vscode.workspace.getConfiguration('lantern');
    assert.equal(config.get('hueUsername'), 'created-username');
    assert.equal(config.get('hueBridgeIp'), '192.0.2.2');
    assert.equal(fetchMock.mock.calls[0].arguments[0], 'http://192.0.2.2/api');
    assert.equal(fetchMock.mock.calls[0].arguments[1]?.method, 'POST');
  });

  test('preserves the link-button API error', async () => {
    mock.method(globalThis, 'fetch', async () =>
      Response.json([{ error: { type: 101, description: 'link button not pressed' } }]),
    );
    const errorMock = mock.method(logger, 'error', () => {});

    await assert.rejects(hue.createUser('192.0.2.1'), new Error('link button not pressed'));
    assert.equal(errorMock.mock.calls[0].arguments[0], 'Failed to create Hue user');
  });

  for (const data of [{}, [], [{}], [{ success: { username: 42 } }]]) {
    test(`rejects malformed user responses: ${JSON.stringify(data)}`, async () => {
      mock.method(globalThis, 'fetch', async () => Response.json(data));
      mock.method(logger, 'error', () => {});

      await assert.rejects(hue.createUser('192.0.2.1'), new Error('Invalid Hue user response'));
      assert.equal(vscode.workspace.getConfiguration('lantern').get('hueUsername'), 'test-username');
    });
  }

  test('maps color and non-color lights without losing state', async () => {
    mock.method(globalThis, 'fetch', async () =>
      Response.json({
        '1': { name: 'Desk', state: { on: true, xy: [0.3, 0.4] } },
        '2': { name: 'Lamp', state: { on: false } },
      }),
    );

    assert.deepEqual(await hue.getLights(), [
      { id: '1', name: 'Desk', on: true, xy: [0.3, 0.4] },
      { id: '2', name: 'Lamp', on: false, xy: undefined },
    ]);
  });

  test('an empty light response is valid', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json({}));

    assert.deepEqual(await hue.getLights(), []);
  });

  for (const light of [
    { name: 42, state: { on: true } },
    { name: 'Desk', state: {} },
    { name: 'Desk', state: { on: true, xy: [0.3] } },
    { name: 'Desk', state: { on: true, xy: ['0.3', 0.4] } },
  ]) {
    test(`rejects malformed light data: ${JSON.stringify(light)}`, async () => {
      mock.method(globalThis, 'fetch', async () => Response.json({ '1': light }));
      const errorMock = mock.method(logger, 'error', () => {});

      await assert.rejects(hue.getLights(), new Error('Invalid Hue light response for light 1'));
      assert.equal(errorMock.mock.calls[0].arguments[0], 'Failed to get Hue lights');
    });
  }

  test('rejects a light API error instead of reporting an empty light list', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json([{ error: { description: 'unauthorized user' } }]));
    mock.method(logger, 'error', () => {});

    await assert.rejects(hue.getLights(), new Error('Invalid Hue lights response'));
  });

  test('recognizes a valid bridge configuration', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json({ name: 'Bridge' }));

    assert.equal(await hue.testConnection(), true);
  });

  test('rejects API authorization errors and unsuccessful HTTP status', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () =>
      Response.json([{ error: { description: 'unauthorized user' } }]),
    );
    assert.equal(await hue.testConnection(), false);

    fetchMock.mock.mockImplementation(async () => Response.json({ name: 'Bridge' }, { status: 503 }));
    assert.equal(await hue.testConnection(), false);
  });

  test('logs malformed bridge configuration data', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json(true));
    const errorMock = mock.method(logger, 'error', () => {});

    assert.equal(await hue.testConnection(), false);
    assert.equal(errorMock.mock.calls[0].arguments[0], 'Hue connection test failed');
  });
});

suite('Hue error notifications', () => {
  let lantern: Lantern;

  setup(() => {
    mock.method(vscode.workspace, 'onDidChangeWorkspaceFolders', () => new vscode.Disposable(() => {}));
    lantern = new Lantern();
  });

  teardown(() => {
    lantern.dispose();
    mock.restoreAll();
  });

  const cases: { error: unknown; message: string }[] = [
    {
      error: new Error('link button not pressed'),
      message: 'Bridge button was not pressed. Please try again and press the button on your Hue bridge.',
    },
    {
      error: { message: 'link button not pressed' },
      message: 'Bridge button was not pressed. Please try again and press the button on your Hue bridge.',
    },
    {
      error: 'Network unavailable',
      message: 'Failed to connect to Hue bridge: Network unavailable',
    },
    {
      error: undefined,
      message: 'Failed to connect to Hue bridge: Unknown error',
    },
  ];

  for (const { error, message } of cases) {
    test(`reports connection errors safely: ${message}`, async () => {
      const hue = lantern.getHueService();
      mock.method(hue, 'isConfigured', () => false);
      mock.method(hue, 'discoverBridges', async () => [{ ip: '192.0.2.1' }]);
      mock.method(hue, 'createUser', async () => {
        throw error;
      });
      mock.method(vscode.window, 'showInformationMessage', async (text: string) =>
        text.startsWith('Press the button') ? 'Continue' : undefined,
      );
      const errorMock = mock.method(vscode.window, 'showErrorMessage', async () => undefined);

      await lantern.enableHue();
      assert.deepEqual(
        errorMock.mock.calls.map((call) => call.arguments[0]),
        [message],
      );
    });
  }

  test('reports discovery failures with unknown thrown values', async () => {
    const hue = lantern.getHueService();
    mock.method(hue, 'isConfigured', () => false);
    mock.method(hue, 'discoverBridges', () => Promise.reject({ message: 42 }));
    mock.method(vscode.window, 'showInformationMessage', async () => undefined);
    const errorMock = mock.method(vscode.window, 'showErrorMessage', async () => undefined);

    await lantern.enableHue();
    assert.deepEqual(
      errorMock.mock.calls.map((call) => call.arguments[0]),
      ['Failed to setup Philips Hue: Unknown error'],
    );
  });

  test('reports light lookup failures with string errors', async () => {
    mock.method(lantern.getHueService(), 'getLights', () => Promise.reject('Network unavailable'));
    const errorMock = mock.method(vscode.window, 'showErrorMessage', async () => undefined);

    await lantern.selectHueLights();
    assert.deepEqual(
      errorMock.mock.calls.map((call) => call.arguments[0]),
      ['Failed to get Hue lights: Network unavailable'],
    );
  });
});
