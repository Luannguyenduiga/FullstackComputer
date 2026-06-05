window.getApiBase = window.getApiBase || function() {
    const origin = window.location.origin || window.location.host;
    if (!origin || origin === 'null') return 'http://localhost:3000';
    return (origin.includes('127.0.0.1') || origin.includes('localhost')) ? 'http://localhost:3000' : '';
};

const form = document.querySelector('form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = {
    name: document.querySelector('#name').value,
    price: document.querySelector('#price').value,
    discount_price: document.querySelector('#discount').value,
    category_id: document.querySelector('#category').value,
    brand_id: document.querySelector('#brand').value,
    description: document.querySelector('#description').value
  };

  const res = await fetch(`${window.getApiBase()}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const result = await res.json();
  console.log(result);
});


