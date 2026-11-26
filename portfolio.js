if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(error => {
    console.warn('A abertura offline está indisponível.', error);
  });
}
