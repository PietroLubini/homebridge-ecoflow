import main from '@ecoflow/index';
import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { API } from 'homebridge';

describe('index', () => {
  let api: jest.Mocked<API>;

  beforeEach(() => {
    api = {
      registerPlatform: jest.fn(),
    } as unknown as jest.Mocked<API>;
  });

  it('should return origin prefix when is requested', () => {
    main(api);

    expect(api.registerPlatform).toHaveBeenCalledWith('EcoFlowHomebridge', EcoFlowHomebridgePlatform);
  });
});
