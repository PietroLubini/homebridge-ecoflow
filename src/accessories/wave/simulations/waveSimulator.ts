import { BmsStatus, PdStatusDev, PowerStatus, WavePowerModeType } from '@ecoflow/accessories/wave/interfaces/waveHttpApiContracts';
import {
  WaveAnalysisPdQuotaParams,
  WaveMqttMessageTypeCodeType,
  WaveMqttQuotaMessageWithParams,
  WaveMqttSetMessage,
} from '@ecoflow/accessories/wave/interfaces/waveMqttApiContracts';
import { MqttSetReplyMessage } from '@ecoflow/apis/interfaces/mqttApiContracts';
import { SimulatorTyped } from '@ecoflow/apis/simulations/simulator';
import { TemperatureDisplayUnitsType } from '@ecoflow/characteristics/characteristicContracts';

export class WaveSimulator extends SimulatorTyped<WaveMqttSetMessage> {
  public override generateQuota(): object {
    const quotaType = this.getRandomNumber(0, 100);
    if (quotaType < 25) {
      const quotaBmsStatus: WaveMqttQuotaMessageWithParams<BmsStatus> = {
        typeCode: WaveMqttMessageTypeCodeType.BMS,
        params: {
          bmsSoc: this.getRandomNumber(0, 100),
          bmsMinDsgSoc: this.getRandomNumber(0, 20),
        },
      };
      return quotaBmsStatus;
    } else if (quotaType < 50) {
      const quotaPdStatus: WaveMqttQuotaMessageWithParams<WaveAnalysisPdQuotaParams> = {
        typeCode: WaveMqttMessageTypeCodeType.PD,
        params: {
          pdMainMode: this.getRandomInt(0, 2),
          pdTempSys: this.getRandomBoolean() ? TemperatureDisplayUnitsType.Celsius : TemperatureDisplayUnitsType.Fahrenheit,
          setFanVal: this.getRandomInt(0, 2),
          lcdStatus: this.getRandomInt(0, 1),
          waterValue: this.getRandomInt(0, 2),
          powerSts: this.getRandomBoolean() ? WavePowerModeType.On : WavePowerModeType.Off,
          setTempCel: this.getRandomNumber(16, 30),
          setTempfah: this.getRandomNumber(60.8, 86),
        },
      };
      return quotaPdStatus;
    } else if (quotaType < 75) {
      const quotaPdDevStatus: WaveMqttQuotaMessageWithParams<PdStatusDev> = {
        typeCode: WaveMqttMessageTypeCodeType.PD_DEV,
        params: {
          coolTemp: this.getRandomNumber(16, 30),
          envTemp: this.getRandomNumber(16, 30),
        },
      };
      return quotaPdDevStatus;
    } else {
      const quotaPowerStatus: WaveMqttQuotaMessageWithParams<PowerStatus> = {
        typeCode: WaveMqttMessageTypeCodeType.POWER,
        params: {
          batVolt: this.getRandomNumber(18000, 24000),
          batCurr: this.getRandomNumber(0, 100000),
          batPwrOut: this.getRandomNumber(0, 50),
          acPwrIn: this.getRandomNumber(0, 50),
        },
      };
      return quotaPowerStatus;
    }
  }

  public override generateSetReplyTyped(message: WaveMqttSetMessage): object {
    const reply: MqttSetReplyMessage = {
      id: message.id,
      version: message.version,
      data: {
        ack: false,
      },
    };
    return reply;
  }
}
