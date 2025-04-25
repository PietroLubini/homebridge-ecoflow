import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import {
  SmartPlugMqttSetCmdCodeType,
  SmartPlugMqttSetMessageWithParams,
  SmartPlugMqttSetSwitchMessageParams,
} from '@ecoflow/accessories/smartplug/interfaces/smartPlugMqttApiContracts';
import { EnableType } from '@ecoflow/characteristics/characteristicContracts';
import { AdditionalOutletCharacteristicType as OutletCharacteristicType } from '@ecoflow/config';
import { OutletServiceBase } from '@ecoflow/services/outletServiceBase';

export class OutletService extends OutletServiceBase {
  constructor(ecoFlowAccessory: EcoFlowAccessoryBase, additionalCharacteristics?: OutletCharacteristicType[]) {
    super(ecoFlowAccessory, additionalCharacteristics);
  }

  protected override processOnSetOn(value: boolean, revert: () => void): Promise<void> {
    const message: SmartPlugMqttSetMessageWithParams<SmartPlugMqttSetSwitchMessageParams> = {
      id: 0,
      version: '',
      cmdCode: SmartPlugMqttSetCmdCodeType.Switch,
      params: {
        plugSwitch: value ? EnableType.On : EnableType.Off,
      },
    };

    return this.ecoFlowAccessory.sendSetCommand(message, revert);
  }
}
