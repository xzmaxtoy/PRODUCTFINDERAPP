// Event listener for DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
    loadCategories();
});

// Function to load categories into the dropdown
async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        const categorySelect = document.getElementById('productCategory');
        categorySelect.innerHTML = '<option value="">Select a category</option>';
        categories.forEach(category => {
            categorySelect.innerHTML += `<option value="${category['分类']}">${category['分类']}</option>`;
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Function to load handles into the datalist
async function loadHandles(category) {
    try {
        const response = await fetch(`/api/handles?category=${category}`);
        const handles = await response.json();
        const handleList = document.getElementById('handleList');
        handleList.innerHTML = ''; // Clear existing options
        handles.forEach(handle => {
            handleList.innerHTML += `<option value="${handle.handle}">${handle.handle}</option>`;
        });
    } catch (error) {
        console.error('Error fetching handles:', error);
    }
}

// Function to load sizes into the dropdown
async function loadSizes(handle) {
    try {
        const response = await fetch(`/api/sizes/${handle}`);
        const sizes = await response.json();
        const sizeSelect = document.getElementById('productSize');
        sizeSelect.innerHTML = '<option value="">Select a size</option>';
        sizes.forEach(size => {
            sizeSelect.innerHTML += `<option value="${size.p_size}">${size.p_size}</option>`;
        });
    } catch (error) {
        console.error('Error fetching sizes:', error);
    }
}

// Function to load cups into the dropdown
async function loadCups(handle, size) {
    try {
        const response = await fetch(`/api/cups/${handle}/${size}`);
        const cups = await response.json();
        const cupSelect = document.getElementById('productCup');
        cupSelect.innerHTML = '<option value="">Select a cup</option>';
        cups.forEach(cup => {
            cupSelect.innerHTML += `<option value="${cup.p_cup}">${cup.p_cup}</option>`;
        });
    } catch (error) {
        console.error('Error fetching cups:', error);
    }
}

// Handlers for dropdown change events
document.getElementById('productCategory').addEventListener('change', function() {
    const category = this.value;
    if (category) {
        loadHandles(category);
    } else {
        document.getElementById('handleList').innerHTML = '';
    }
});

// When the handle is selected from the datalist, load sizes and cups
document.getElementById('productHandleInput').addEventListener('input', function() {
    const handleValue = this.value;
    // Load sizes and reset cups when a new handle is entered
    loadSizes(handleValue);
    document.getElementById('productCup').innerHTML = '<option value="">Select a cup</option>';
});

// When the size is selected, load cups
document.getElementById('productSize').addEventListener('change', function() {
    const handleValue = document.getElementById('productHandleInput').value;
    const sizeValue = this.value;
    if (handleValue && sizeValue) {
        loadCups(handleValue, sizeValue);
    }
});



// Function to fetch and display product details
async function loadProductDetails(handle, cup, size) {
    // Ensure the parameters are in the correct order: handle, cup, size
    const endpoint = `/api/product-details?handle=${encodeURIComponent(handle)}&cup=${encodeURIComponent(cup)}&size=${encodeURIComponent(size)}`;
    console.log('Requesting:', endpoint);
    try {
        const response = await fetch(endpoint);
        const productDetails = await response.json();
        console.log('Product details:', productDetails);
        displayProductDetails(productDetails);
    } catch (error) {
        console.error('Error fetching product details:', error);
    }
}

// Function to display product details in a table
function displayProductDetails(productDetails) {
    const tableBody = document.getElementById('productDetailsTableBody');
    tableBody.innerHTML = ''; // Clear existing table rows

    productDetails.forEach(product => {
        const row = `<tr>
                        <td>${product.sku}</td>
                        <td>${product.名称}</td>
                     </tr>`;
        tableBody.innerHTML += row;
    });
}



// Ensure to call this function with the right order of parameters
// Call loadProductDetails when both size and cup are selected
document.getElementById('productCup').addEventListener('change', function() {
    const handleValue = document.getElementById('productHandleInput').value;
    const cupValue = this.value; // Might be empty
    const sizeValue = document.getElementById('productSize').value; // Might be empty

    if (handleValue) { // Now we only check if handleValue is present
        loadProductDetails(handleValue, cupValue, sizeValue);
    }
});
