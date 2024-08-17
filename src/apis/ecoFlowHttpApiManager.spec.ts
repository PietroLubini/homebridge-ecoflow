import { DeviceInfo } from '@ecoflow/apis/containers/deviceInfo';
import { EcoFlowHttpApiManager } from '@ecoflow/apis/ecoFlowHttpApiManager';
import { DeviceAccessConfig, LocationType } from '@ecoflow/config';
import { Logging } from 'homebridge';

describe('EcoFlowHttpApiManager', () => {
  let logMock: jest.Mocked<Logging>;
  let manager: EcoFlowHttpApiManager;
  let config: DeviceAccessConfig;
  let deviceInfo: DeviceInfo;
  let headers: HeadersInit;
  const fetchMock = jest.fn();
  global.fetch = fetchMock;

  beforeEach(() => {
    logMock = {
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logging>;
    config = {
      name: 'accessory1',
      secretKey: 'secretKey1',
      accessKey: 'accessKey1',
      serialNumber: 'sn1',
      location: LocationType.EU,
    };
    deviceInfo = new DeviceInfo(config, logMock);
    manager = new EcoFlowHttpApiManager();

    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    jest.spyOn(Date, 'now').mockReturnValue(1723391079346);
    fetchMock.mockReset();
  });

  describe('acquireCertificate', () => {
    beforeEach(() => {
      headers = {
        accessKey: 'accessKey1',
        nonce: '500000',
        timestamp: '1723391079346',
        sign: '0495cce08eb208c95e2707e664de5e89c98aaecfa7b513272439f1003a297745',
      };
    });

    it('should return null when it is failed to send http request', async () => {
      const fetchError = new Error('Server connection is failed');
      fetchMock.mockImplementation(() => {
        throw fetchError;
      });

      const actual = await manager.acquireCertificate(deviceInfo);

      expect(actual).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith('https://api-e.ecoflow.com/iot-open/sign/certification', {
        method: 'GET',
        headers: new Headers(headers),
      });
      expect(logMock.debug).toHaveBeenCalledWith('Acquire certificate for MQTT connection');
      expect(logMock.error).toHaveBeenCalledWith('Request is failed:', fetchError);
    });

    it("should return null when response contains non '0' code in response", async () => {
      const responseMock = {
        json: jest.fn(),
        status: 401,
        statusText: 'Access is denied',
      } as unknown as jest.Mocked<Response>;
      fetchMock.mockResolvedValueOnce(responseMock);
      responseMock.json.mockResolvedValueOnce({ code: '401' });

      const actual = await manager.acquireCertificate(deviceInfo);

      expect(actual).toBeNull();
      expect(logMock.error).toHaveBeenCalledWith(
        'Request is failed:',
        new Error(
          'Request to "https://api-e.ecoflow.com/iot-open/sign/certification" with options: ' +
            '"{"method":"GET","headers":{"accesskey":"accessKey1","nonce":"500000",' +
            '"sign":"0495cce08eb208c95e2707e664de5e89c98aaecfa7b513272439f1003a297745","timestamp":"1723391079346"}}" is failed\n' +
            '[401]: Access is denied; result: {"code":"401"}'
        )
      );
    });

    it('should use US host name when it is specified in configuration', async () => {
      config.location = LocationType.US;
      fetchMock.mockImplementation(() => {
        throw new Error('Server connection is failed');
      });

      await manager.acquireCertificate(deviceInfo);
      const actual = fetchMock.mock.calls[0][0];

      expect(actual).toEqual('https://api-a.ecoflow.com/iot-open/sign/certification');
    });

    it('should return certificate data when request is successful', async () => {
      const expected = { certificateAccount: 'account1' };
      const responseMock = { json: jest.fn() } as unknown as jest.Mocked<Response>;
      fetchMock.mockResolvedValueOnce(responseMock);
      responseMock.json.mockResolvedValueOnce({ code: '0', data: expected });

      const actual = await manager.acquireCertificate(deviceInfo);

      expect(actual).toEqual(expected);
      expect(logMock.error).not.toHaveBeenCalled();
    });
  });

  describe('getAllQuotas', () => {
    beforeEach(() => {
      headers = {
        accessKey: 'accessKey1',
        nonce: '500000',
        timestamp: '1723391079346',
        sign: '858df27adbed48458a6de2c03d9c752bbdae258f4f32ed67f7a0f732607b15d3',
      };
    });

    it('should return null when it is failed to send http request', async () => {
      const fetchError = new Error('Server connection is failed');
      fetchMock.mockImplementation(() => {
        throw fetchError;
      });

      const actual = await manager.getAllQuotas(deviceInfo);

      expect(actual).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith('https://api-e.ecoflow.com/iot-open/sign/device/quota/all?sn=sn1', {
        method: 'GET',
        headers: new Headers(headers),
      });
      expect(logMock.debug).toHaveBeenCalledWith('Get all quotas');
      expect(logMock.error).toHaveBeenCalledWith('Request is failed:', fetchError);
    });

    it('should return all quota data converted to typed object when request is successful', async () => {
      const expected = { inv: { cfgAcOutVol: 10.1, cfgAcXboost: true }, pd: { carWatts: 45.67 } };
      const responseMock = { json: jest.fn() } as unknown as jest.Mocked<Response>;
      fetchMock.mockResolvedValueOnce(responseMock);
      responseMock.json.mockResolvedValueOnce({
        code: '0',
        data: { 'inv.cfgAcOutVol': 10.1, 'inv.cfgAcXboost': true, 'pd.carWatts': 45.67 },
      });

      const actual = await manager.getAllQuotas(deviceInfo);

      expect(actual).toEqual(expected);
      expect(logMock.error).not.toHaveBeenCalled();
    });
  });

  describe('getQuotas', () => {
    const quotas = ['inv.cfgAcOutVol', 'pd.carWatts'];
    beforeEach(() => {
      headers = {
        accessKey: 'accessKey1',
        nonce: '500000',
        timestamp: '1723391079346',
        sign: 'd24843a8d7779df36118da580e529326c218368c34ef74766712be007a8ddee0',
      };
    });

    it('should return null when it is failed to send http request', async () => {
      const fetchError = new Error('Server connection is failed');
      fetchMock.mockImplementation(() => {
        throw fetchError;
      });

      const actual = await manager.getQuotas(quotas, deviceInfo);

      expect(actual).toBeNull();
      expect(fetchMock).toHaveBeenCalledWith(
        'https://api-e.ecoflow.com/iot-open/sign/device/quota?params.quotas[0]=inv.cfgAcOutVol&params.quotas[1]=pd.carWatts&sn=sn1',
        {
          method: 'POST',
          headers: new Headers(headers),
        }
      );
      expect(logMock.debug).toHaveBeenCalledWith('Get quotas:', quotas);
      expect(logMock.error).toHaveBeenCalledWith('Request is failed:', fetchError);
    });

    it('should return requested quota data converted to typed object when request is successful', async () => {
      const expected = { inv: { cfgAcOutVol: 10.1 }, pd: { carWatts: 45.67 } };
      const responseMock = { json: jest.fn() } as unknown as jest.Mocked<Response>;
      fetchMock.mockResolvedValueOnce(responseMock);
      responseMock.json.mockResolvedValueOnce({
        code: '0',
        data: { 'inv.cfgAcOutVol': 10.1, 'pd.carWatts': 45.67 },
      });

      const actual = await manager.getQuotas(quotas, deviceInfo);

      expect(actual).toEqual(expected);
      expect(logMock.error).not.toHaveBeenCalled();
    });
  });
});
