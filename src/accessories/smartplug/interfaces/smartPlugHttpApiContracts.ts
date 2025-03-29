export interface Heartbeat {
  temp?: number; // Temparture, C (read)
  volt?: number; // Operating voltage , V (read)
  current?: number; // Operating current, mA (read)
  switchSta?: boolean; // Switch status (read/write)
  watts?: number; //Output consumption, 0.1 W (read)
  brightness?: number; //RGB light brightness: 0-1023 (read/write)
}

export interface SmartPlugAllQuotaData {
  '2_1': Heartbeat;
}
