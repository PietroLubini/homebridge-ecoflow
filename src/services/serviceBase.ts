import { Logging, Service } from 'homebridge';
import { EcoFlowAccessory } from '../accessories/ecoFlowAccessory.js';
import { EcoFlowHomebridgePlatform } from '../platform.js';

export abstract class ServiceBase {
  protected readonly log: Logging;
  protected readonly platform: EcoFlowHomebridgePlatform;
  private _service: Service | null = null;

  constructor(protected readonly ecoFlowAccessory: EcoFlowAccessory) {
    this.log = ecoFlowAccessory.log;
    this.platform = ecoFlowAccessory.platform;
  }

  public initialize(): void {
    this._service = this.createService();
  }

  // Getter for service
  public get service(): Service {
    return this._service!;
  }

  protected abstract createService(): Service;
}
