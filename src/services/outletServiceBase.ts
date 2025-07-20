import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { CharacteristicPermsType } from '@ecoflow/characteristics/characteristicExtensions';
import { AdditionalOutletCharacteristicType as OutletCharacteristicType } from '@ecoflow/config';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { Characteristic, CharacteristicValue, WithUUID } from 'homebridge';

export abstract class OutletServiceBase extends ServiceBase {
  private state: boolean = false;

  constructor(
    ecoFlowAccessory: EcoFlowAccessoryBase,
    private readonly additionalCharacteristics?: string[],
    serviceSubType?: string,
    private readonly onCharacteristicPermsType: CharacteristicPermsType = CharacteristicPermsType.DEFAULT
  ) {
    super(ecoFlowAccessory.platform.Service.Outlet, ecoFlowAccessory, serviceSubType);
  }

  public updateState(state: boolean): void {
    this.state = state;
    this.updateCharacteristic(this.platform.Characteristic.On, 'State', state);
  }

  public updateOutputConsumption(watt: number): void {
    this.updateCharacteristic(this.platform.Characteristic.OutletInUse, 'InUse', watt > 0);
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.OutputConsumptionWatts,
      'Output Consumption, W',
      () => watt,
      OutletCharacteristicType.OutputConsumptionInWatts
    );
  }

  public updateOutputVoltage(volt: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.OutputVoltage,
      'Output Voltage, V',
      () => volt,
      OutletCharacteristicType.OutputVoltage
    );
  }

  public updateOutputCurrent(ampere: number): void {
    this.updateCustomCharacteristic(
      this.platform.Characteristic.PowerConsumption.OutputCurrent,
      'Output Current, A',
      () => ampere,
      OutletCharacteristicType.OutputCurrent
    );
  }

  protected override addCharacteristics(): Characteristic[] {
    const onCharacteristic = this.addCharacteristic(this.platform.Characteristic.On)
      .setPropsPerms(this.onCharacteristicPermsType)
      .onGet(() => this.processOnGet(this.state))
      .onSet((value: CharacteristicValue) => {
        this.processOnSetVerify(this.platform.Characteristic.On.name);
        const revert = () => this.updateState(!value);
        this.processOnSet(async () => {
          this.state = value as boolean;
          await this.processOnSetOn(this.state, revert);
        }, revert);
      });

    const characteristics = [
      this.addCharacteristic(this.platform.Characteristic.OutletInUse),
      onCharacteristic,
      this.tryAddCustomCharacteristic(this.platform.Characteristic.PowerConsumption.OutputVoltage, OutletCharacteristicType.OutputVoltage),
      this.tryAddCustomCharacteristic(this.platform.Characteristic.PowerConsumption.OutputCurrent, OutletCharacteristicType.OutputCurrent),
      this.tryAddCustomCharacteristic(
        this.platform.Characteristic.PowerConsumption.OutputConsumptionWatts,
        OutletCharacteristicType.OutputConsumptionInWatts
      ),
    ];
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.serviceName);

    return characteristics.filter(characteristic => characteristic !== null);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected processOnSetOn(value: boolean, revert: () => void): Promise<void> {
    /* istanbul ignore next */
    return Promise.resolve();
  }

  protected tryAddCustomCharacteristic(characteristic: WithUUID<{ new (): Characteristic }>, characteristicType: string): Characteristic | null {
    if (this.additionalCharacteristics?.includes(characteristicType)) {
      return this.addCharacteristic(characteristic);
    }
    return null;
  }

  protected updateCustomCharacteristic(
    characteristic: WithUUID<{ new (): Characteristic }>,
    name: string,
    valueFunc: () => CharacteristicValue,
    characteristicType: string
  ): void {
    if (this.additionalCharacteristics?.includes(characteristicType)) {
      this.updateCharacteristic(characteristic, name, valueFunc());
    }
  }
}
