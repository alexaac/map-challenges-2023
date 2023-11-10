export class Util {
  constructor() {}

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }
  getDegree(radian) {
    return (radian / Math.PI) * 180;
  }
  getRadian(degrees) {
    return (degrees * Math.PI) / 180;
  }
  getSpherical(rad1, rad2, r) {
    var x = Math.cos(rad1) * Math.cos(rad2) * r;
    var z = Math.cos(rad1) * Math.sin(rad2) * r;
    var y = Math.sin(rad1) * r;
    return [x, y, z];
  }
}
