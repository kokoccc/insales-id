async function showIDs() {

  const classes = {
    added: 'id-added',
    product: 'product-id-added',
    variants: 'variants-id-added',
    variant: 'variant-id-added'
  }

  const urlMatches = [
    '/admin2/collections/',
    '/admin2/categories/',
    '/admin2/products/',
    '/admin2/orders/'
  ];

  if (!urlMatches.some(match => location.pathname.startsWith(match))) {
    return;
  }

  const productsTable = document.querySelector('#products');
  const variantsTable = document.querySelector(`#variants-table:not(.${ classes.variants })`);
  const orderTable = document.querySelector(`#order-details #order-lines-table:not(.${ classes.added })`);

  if (!productsTable && !variantsTable && !orderTable) {
    return;
  }

  const CELL_IDS_INDEX = 2;
  const CELL_IDS_CLASS = 'ids';
  const CLS_FETCHING = 'variants-id-fetching';
  const line = '<hr style="margin: 3px 0;">';


  const Fetching = {
    add() {
      document.documentElement.classList.add(CLS_FETCHING);
      chrome.runtime.sendMessage({ fetching: true });
    },
    remove() {
      document.documentElement.classList.remove(CLS_FETCHING);
      chrome.runtime.sendMessage({ fetching: false });
    },
    check() {
      return document.documentElement.classList.contains(CLS_FETCHING);
    }
  };


  if (Fetching.check()) {
    return;
  }


  if (variantsTable) {
    const headRow = variantsTable.querySelector('thead tr');
    const secondCell = headRow.firstElementChild.nextElementSibling;
    const headIDCell = secondCell.cloneNode();

    headIDCell.classList.add('text-center');
    headIDCell.textContent = 'ID варианта';
    secondCell.insertAdjacentElement('afterend', headIDCell);

    const variantsRows = variantsTable.querySelectorAll('tr[id^="variant_"]');

    variantsRows.forEach(row => {
      const id = row.id.replace('variant_', '');
      const secondCell = row.firstElementChild.nextElementSibling;
      const variantIDCell = secondCell.cloneNode();

      variantIDCell.classList.add('text-center');
      variantIDCell.textContent = id;

      secondCell.insertAdjacentElement('afterend', variantIDCell);
    });

    variantsTable.classList.add(classes.variants);

    return;
  }


  if (orderTable) {
    addTableIDCells(orderTable, true);

    const rows = orderTable.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const imageCell = row.querySelector('.image');
      const titleCell = row.querySelector('.title');

      if (!imageCell) {
        return;
      }

      const idCell = row.children[CELL_IDS_INDEX];

      const productID = imageCell.id.match(/\d+/)[0];
      const variantID = titleCell.id.match(/\d+/)[0];

      const html = `Product ID: ${ productID } ${line} Variant ID: ${ variantID }`;
      idCell.insertAdjacentHTML('beforeend', html);

      return;
    });

    orderTable.classList.add(classes.added);

    return;
  }


  async function getProductsData(ids) {
    const idsString = ids.join(',');
    let cachedData;

    await new Promise(resolve => {
      chrome.storage.local.get(['InSales_Variant_ID'], data => {
        cachedData = data?.InSales_Variant_ID;
        return resolve();
      });
    });

    if (idsString === cachedData?.ids) {
      return cachedData.json;
    }

    try {
      Fetching.add();

      const response = await fetch(`/admin/products/by_ids.json?product_ids=${ idsString }`);
      const json = await response.json();

      chrome.storage.local.set({
        InSales_Variant_ID: {
          ids: idsString,
          json: json
        }
      });

      return json;
    } catch (err) {
      return null;
    }
  }


  function addTableIDCells(table, center) {
    const tableCell = table.querySelector(`.${CELL_IDS_CLASS}`);
    if (tableCell) return;

    const titleCell = table.querySelector(`thead tr:last-child th:nth-child(${ CELL_IDS_INDEX + 1 })`);
    const idsTitleCell = document.createElement('th');

    idsTitleCell.classList.add(CELL_IDS_CLASS);

    if (center) {
      idsTitleCell.style.textAlign = 'center';
    }

    idsTitleCell.textContent = 'ID';

    titleCell.insertAdjacentElement('beforebegin', idsTitleCell);

    table.querySelectorAll(`td:nth-child(${ CELL_IDS_INDEX + 1 })`).forEach(cell => {
      const idsCell = document.createElement('td');

      if (center) {
        idsCell.style.textAlign = 'center';
      }

      cell.insertAdjacentElement('beforebegin', idsCell);
    });
  }


  function addProductsIDs() {
    const productsRows = productsTable.querySelectorAll(`.product:not(.${ classes.product })`);

    productsRows.forEach(row => {
      const productID = row.dataset.id;
      const titleEl = row.children[CELL_IDS_INDEX];

      const productIDElement = document.createElement('div');
      productIDElement.textContent = `Product ID: ${ productID }`;

      titleEl.insertAdjacentElement('beforeend', productIDElement);
      row.classList.add(classes.product);
    });
  }


  function addTheOnlyVariantsIDs(productsData) {
    const productsWithOneVariant = productsData.filter(product => product.variants.length === 1);

    productsWithOneVariant.forEach(product => {
      const productRow = productsTable.querySelector(`.product[data-id="${ product.id }"]:not(.${ classes.variant })`);

      if (!productRow) {
        return;
      }

      const titleEl = productRow.children[CELL_IDS_INDEX];

      const variantIDElement = document.createElement('div');
      variantIDElement.textContent = `Variant ID: ${ product.variants[0].id }`;
      variantIDElement.insertAdjacentHTML('afterbegin', line);

      titleEl.insertAdjacentElement('beforeend', variantIDElement);
      productRow.classList.add(classes.variant);
    });
  }


  function addOpenedVariantsIDs(product, titleEl) {
    const productRow = productsTable.querySelector(`.product[data-id="${ product.id }"]`);
    const productVariantsIDsEl = titleEl.querySelector('.product-variants-ids');

    productRow.classList.remove(classes.variants);
    productVariantsIDsEl?.remove();

    product.variants.forEach(variant => {
      const titleElSelector = `#product-${ product.id }-variant-${ variant.id }-title:not(.${ classes.variant })`;
      const titleEl = document.querySelector(titleElSelector);

      if (!titleEl) {
        return;
      }

      const variantIDElement = document.createElement('div');
      variantIDElement.textContent = `Variant ID: ${ variant.id }`;

      titleEl.insertAdjacentElement('beforeend', variantIDElement);
      titleEl.classList.add(classes.variant);
    });
  }


  function addClosedVariantsIDs(product, titleEl) {
    const productRow = productsTable.querySelector(`.product[data-id="${ product.id }"]:not(.${ classes.variants })`);

    if (!productRow) {
      return;
    }

    const variants = product.variants.reduce((arr, variant) => {
      const variantText = `${ variant.title }<br>ID:&nbsp;${ variant.id }`;
      arr.push(variantText);
      return arr;
    }, []);

    const variantsEl = document.createElement('div');
    variantsEl.classList.add('product-variants-ids');
    variantsEl.style.marginTop = '5px';

    const variantsElHTML = line.repeat(2) + 'Variants:' + line + variants.join(line);
    variantsEl.insertAdjacentHTML('beforeend', variantsElHTML);

    titleEl.insertAdjacentElement('beforeend', variantsEl);
    productRow.classList.add(classes.variants);
  }


  function addVariantsIDs(productsData) {
    const productsWithVariants = productsData.filter(product => product.variants.length > 1);

    productsWithVariants.forEach(product => {
      const productRow = productsTable.querySelector(`.product[data-id="${ product.id }"]`);
      const variantsOpened = productRow.nextElementSibling?.classList.contains('variant');

      const titleEl = productRow.children[CELL_IDS_INDEX];

      if (variantsOpened) {
        addOpenedVariantsIDs(product, titleEl);
      } else {
        addClosedVariantsIDs(product, titleEl);
      }
    });
  }


  const productsElements = productsTable.querySelectorAll('.product');

  if (!productsElements.length) {
    return;
  }

  const productsIDs = [...productsElements].map(el => el.dataset.id);
  const productsData = await getProductsData(productsIDs);

  addTableIDCells(productsTable);
  addProductsIDs();
  addTheOnlyVariantsIDs(productsData);
  addVariantsIDs(productsData);

  Fetching.remove();
}

chrome.runtime.onMessage.addListener(request => {
  const iconName = request.fetching ? 'icon_gray' : 'icon';

  chrome.action.setIcon({
    path: {
      '16': `icons/${iconName}@16.png`,
      '24': `icons/${iconName}@24.png`,
      '32': `icons/${iconName}@32.png`
    }
  });
});

chrome.action.onClicked.addListener(tab => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: showIDs
  });
});
