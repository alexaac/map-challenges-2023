window.addEventListener('keydown', (event) => {
  if (event.key === 'h') {
    if (document.querySelector('.nav--gridContainer'))
      document.querySelector('.nav--gridContainer').classList.add('hide-all');

    if (document.querySelector('.side-pannel'))
      document.querySelector('.side-pannel').classList.add('hide-all');

    if (document.querySelector('.main--contentWrapper'))
      document.querySelector('.main--contentWrapper').classList.add('hide-all');

    if (document.querySelector('.content--contentWrapper'))
      document
        .querySelector('.content--contentWrapper')
        .classList.add('hide-all');

    if (document.querySelector('.content--subCopy'))
      document.querySelector('.content--subCopy').classList.add('hide-all');

    if (document.querySelector('.below'))
      document.querySelector('.below').classList.add('hide-all');
  }
});

// Canvas
const canvas = document.querySelector('canvas.webgl');

// document.getElementById('downloadLink').addEventListener('click', function () {
//   var img = canvas.toDataURL('image/png');
//   this.href = img;

//   // map.getCanvas().toBlob(function (blob) {
//   //   saveAs(blob, 'map.png');
//   // });
// });

var dpi = 300;
Object.defineProperty(window, 'devicePixelRatio', {
  get: function () {
    return dpi / 96;
  },
});

window.addEventListener('keydown', function (event) {
  if (event.key === 'p') {
    console.log('----------------');
    var img = canvas.toBlob(function (blob) {
      saveAs(blob, 'map.png');
    });
  }
});
