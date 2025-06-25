export class MiBandBLE {
  constructor() {
    this.device = null;
    this.server = null;
    this.batteryChar = null;
    this.heartRateChar = null;
    this.onDisconnectedCallback = null;
  }

  async scanAndConnect() {
    if (!navigator.bluetooth) throw new Error('Web Bluetooth API tidak didukung di browser ini');

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'Mi Band' }],
      optionalServices: ['battery_service', 'heart_rate']
    });

    this.device.addEventListener('gattserverdisconnected', () => {
      if (this.onDisconnectedCallback) this.onDisconnectedCallback();
    });

    this.server = await this.device.gatt.connect();

    const batteryService = await this.server.getPrimaryService('battery_service');
    this.batteryChar = await batteryService.getCharacteristic('battery_level');

    const hrService = await this.server.getPrimaryService('heart_rate');
    this.heartRateChar = await hrService.getCharacteristic('heart_rate_measurement');

    return this.device;
  }

  async readBatteryLevel() {
    if (!this.batteryChar) throw new Error('Battery characteristic tidak tersedia');
    const value = await this.batteryChar.readValue();
    return value.getUint8(0);
  }

  async startHeartRateNotifications(callback) {
    if (!this.heartRateChar) throw new Error('Heart Rate characteristic tidak tersedia');
    this.heartRateChar.addEventListener('characteristicvaluechanged', event => {
      const value = event.target.value;
      // Heart Rate format parsing (standar BLE)
      const flags = value.getUint8(0);
      let hr = 0;
      if ((flags & 0x01) === 0) {
        hr = value.getUint8(1);
      } else {
        hr = value.getUint16(1, /*littleEndian=*/true);
      }
      callback(hr);
    });
    await this.heartRateChar.startNotifications();
  }

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
  }

  setOnDisconnectedCallback(callback) {
    this.onDisconnectedCallback = callback;
  }
}
