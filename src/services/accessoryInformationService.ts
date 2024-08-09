import { Characteristic, Service } from 'homebridge';
import { ServiceBase } from './serviceBase';

export class AccessoryInformationService extends ServiceBase {
  protected override createService(): Service {
    return this.getOrAddService(this.platform.Service.AccessoryInformation, 'Information');
  }

  protected override addCharacteristics(): Characteristic[] {
    const characteristics = [
      this.addCharacteristic(this.platform.Characteristic.Manufacturer),
      this.addCharacteristic(this.platform.Characteristic.Model),
      this.addCharacteristic(this.platform.Characteristic.SerialNumber),
      this.addCharacteristic(this.platform.Characteristic.FirmwareRevision),
      this.addCharacteristic(this.platform.Characteristic.Identify),
    ];

    this.service
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'EcoFlow')
      .setCharacteristic(this.platform.Characteristic.Model, this.ecoFlowAccessory.config.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.ecoFlowAccessory.config.serialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.getVersion());
    return characteristics;
  }

  private getVersion(): string {
    // TBD
    // const filename = fileURLToPath(import.meta.url);
    // const dirname = path.dirname(filename);
    // const packageJsonPath = path.resolve(dirname, '../../package.json');
    // const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    // return packageData?.version;
    return '123';
  }
}
