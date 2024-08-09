import { Logging } from 'homebridge';
import { EcoFlowHttpApi } from './ecoFlowHttpApi';
import { EcoFlowMqttApi } from './ecoFlowMqttApi';

describe('EcoFlowMqttApi', () => {
  let httpApiMock: EcoFlowHttpApi;
  let logMock: Logging;
  let api: EcoFlowMqttApi;

  beforeEach(() => {
    httpApiMock = jest.fn() as unknown as EcoFlowHttpApi;
    logMock = {
      debug: jest.fn(),
      info: jest.fn(),
    } as unknown as Logging;
    api = new EcoFlowMqttApi(httpApiMock, logMock);
  });

  describe('destroy', () => {
    // it('should unsubscribe from all topics when destroying the instance', async () => {
    //   await api.destroy();

    //   expect(actual.UUID).toEqual('13172B0A-D346-4730-9732-32EF5B6EF8B7');
    // });

    it('should ignore unsubscribing from all topics when destroying the instance and there is no subscription', async () => {
      // jest.spyOn(httpApiMock, 'acquireCertificate').mockResolvedValue(null);

      await api.destroy();

      // expect(actual.UUID).toEqual('13172B0A-D346-4730-9732-32EF5B6EF8B7');
    });
  });
});
