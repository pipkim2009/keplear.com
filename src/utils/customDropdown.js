// Custom Dropdown Utility - Following W3Schools Guide
// Handles dropdown open/close and selection functionality

export class CustomDropdown {
  constructor(dropdownElement) {
    this.dropdown = dropdownElement;
    this.button = dropdownElement.querySelector('.custom-dropbtn');
    this.content = dropdownElement.querySelector('.custom-dropdown-content');
    this.items = dropdownElement.querySelectorAll('.custom-dropdown-item');
    this.selectedValue = null;
    this.onChange = null;

    this.init();
  }

  init() {
    // Toggle dropdown on button click
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Handle item selection
    this.items.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectItem(item);
        this.close();
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.dropdown.contains(e.target)) {
        this.close();
      }
    });

    // Set initial selection if there's a selected item
    const selectedItem = this.dropdown.querySelector('.custom-dropdown-item.selected');
    if (selectedItem) {
      this.selectedValue = selectedItem.dataset.value;
      this.updateButtonText();
    }
  }

  toggle() {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    // Close all other dropdowns first
    document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
      if (dropdown !== this.dropdown) {
        dropdown.classList.remove('open');
        dropdown.querySelector('.custom-dropdown-content').classList.remove('show');
      }
    });

    this.dropdown.classList.add('open');
    this.content.classList.add('show');
  }

  close() {
    this.dropdown.classList.remove('open');
    this.content.classList.remove('show');
  }

  isOpen() {
    return this.content.classList.contains('show');
  }

  selectItem(item) {
    // Remove previous selection
    this.items.forEach(i => i.classList.remove('selected'));

    // Add selection to clicked item
    item.classList.add('selected');

    // Update selected value
    this.selectedValue = item.dataset.value;

    // Update button text
    this.updateButtonText();

    // Trigger onChange callback if set
    if (this.onChange && typeof this.onChange === 'function') {
      this.onChange(this.selectedValue, item.textContent);
    }
  }

  updateButtonText() {
    const selectedItem = this.dropdown.querySelector('.custom-dropdown-item.selected');
    if (selectedItem) {
      const buttonText = this.button.querySelector('.button-text') || this.button;
      const arrow = this.button.querySelector('::after') ? '' : '';
      if (this.button.querySelector('.button-text')) {
        this.button.querySelector('.button-text').textContent = selectedItem.textContent;
      } else {
        // If no separate text element, update the whole button but preserve the arrow
        const text = selectedItem.textContent;
        this.button.innerHTML = `<span class="button-text">${text}</span>`;
      }
    }
  }

  setValue(value) {
    const item = this.dropdown.querySelector(`[data-value="${value}"]`);
    if (item) {
      this.selectItem(item);
    }
  }

  getValue() {
    return this.selectedValue;
  }

  setOnChange(callback) {
    this.onChange = callback;
  }
}

// Initialize all dropdowns on page load
export function initializeCustomDropdowns() {
  document.querySelectorAll('.custom-dropdown').forEach(dropdown => {
    new CustomDropdown(dropdown);
  });
}

// Helper function to convert regular select to custom dropdown
export function convertSelectToCustomDropdown(selectElement, parentContainer) {
  const options = Array.from(selectElement.options);
  const selectedIndex = selectElement.selectedIndex;

  // Create dropdown HTML
  const dropdownHTML = `
    <div class="custom-dropdown">
      <button class="custom-dropbtn">
        <span class="button-text">${options[selectedIndex]?.text || 'Select...'}</span>
      </button>
      <div class="custom-dropdown-content">
        ${options.map(option =>
          `<div class="custom-dropdown-item ${option.selected ? 'selected' : ''}"
               data-value="${option.value}">
             ${option.text}
           </div>`
        ).join('')}
      </div>
    </div>
  `;

  // Replace select element
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = dropdownHTML;
  const newDropdown = tempDiv.firstElementChild;

  if (parentContainer) {
    parentContainer.appendChild(newDropdown);
  } else {
    selectElement.parentNode.insertBefore(newDropdown, selectElement);
  }

  // Initialize the dropdown
  const customDropdown = new CustomDropdown(newDropdown);

  // Set up onChange to update original select (for form compatibility)
  customDropdown.setOnChange((value) => {
    selectElement.value = value;
    // Trigger change event on original select
    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Hide original select
  selectElement.style.display = 'none';

  return customDropdown;
}