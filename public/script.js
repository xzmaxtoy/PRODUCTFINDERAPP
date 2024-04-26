async function searchHandle() {
    const input = document.getElementById('productHandle').value;
    const dropdown = document.getElementById('dropdown');
    if (!input) {
        dropdown.style.display = 'none';
        return;
    }

    try {
        // Fetch the handles from the server
        const response = await fetch('/api/handles');
        const handles = await response.json();

        // Filter handles based on input and display them in the dropdown
        const filteredHandles = handles.filter(h => 
            h.handle.toLowerCase().includes(input.toLowerCase())
        );

        dropdown.innerHTML = filteredHandles.map(h => 
            `<div onclick="selectHandle('${h.handle}')">${h.handle}</div>`
        ).join('');

        dropdown.style.display = 'block';
    } catch (error) {
        console.error('Error fetching handles:', error);
    }
}

function selectHandle(value) {
    document.getElementById('productHandle').value = value;
    document.getElementById('dropdown').style.display = 'none';
}

function selectHandle(handle) {
    document.getElementById('productHandle').value = handle;
    loadSizes(handle);
    document.getElementById('dropdown').style.display = 'none';
}

async function loadSizes(handle) {
    try {
        const response = await fetch(`/api/sizes/${handle}`);
        const sizes = await response.json();

        const sizeSelect = document.getElementById('productSize');
        sizeSelect.innerHTML = sizes.map(s => `<option value="${s.p_size}">${s.p_size}</option>`).join('');
    } catch (error) {
        console.error('Error fetching sizes:', error);
    }
}

async function updateCups() {
    const handle = document.getElementById('productHandle').value;
    const size = document.getElementById('productSize').value;
    
    if (!handle || !size) {
        document.getElementById('productCup').innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`/api/cups/${handle}/${size}`);
        const cups = await response.json();

        const cupSelect = document.getElementById('productCup');
        cupSelect.innerHTML = cups.map(c => `<option value="${c.p_cup}">${c.p_cup}</option>`).join('');
    } catch (error) {
        console.error('Error fetching cups:', error);
    }
}
