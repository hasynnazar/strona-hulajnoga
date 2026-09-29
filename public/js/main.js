document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Close mobile menu on click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });

    // Load available slots
    const slotSelect = document.getElementById('slot_id');
    const formMessage = document.getElementById('formMessage');

    async function loadSlots() {
        try {
            const res = await fetch('/api/slots');
            const slots = await res.json();
            
            slotSelect.innerHTML = '';
            
            if (slots.length === 0) {
                const option = document.createElement('option');
                option.value = "";
                option.textContent = "Brak wolnych terminów, zadzwoń do nas!";
                slotSelect.appendChild(option);
            } else {
                const defaultOpt = document.createElement('option');
                defaultOpt.value = "";
                defaultOpt.textContent = "Wybierz datę i godzinę...";
                slotSelect.appendChild(defaultOpt);

                slots.forEach(slot => {
                    const option = document.createElement('option');
                    option.value = slot.id;
                    option.textContent = `${slot.date} o godz. ${slot.time}`;
                    slotSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Błąd ładowania terminów:', error);
            slotSelect.innerHTML = '<option value="">Błąd ładowania terminów</option>';
        }
    }

    if (slotSelect) {
        loadSlots();
    }

    // Toggle address field based on delivery type
    const deliveryRadios = document.querySelectorAll('input[name="delivery_type"]');
    const addressGroup = document.getElementById('address-group');
    const addressInput = document.getElementById('address');

    if (deliveryRadios.length > 0 && addressGroup) {
        deliveryRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'Door-to-door') {
                    addressGroup.style.display = 'block';
                    addressInput.setAttribute('required', 'required');
                } else {
                    addressGroup.style.display = 'none';
                    addressInput.removeAttribute('required');
                    addressInput.value = '';
                }
            });
        });
    }

    // Handle form submission
    const bookingForm = document.getElementById('bookingForm');
    const modal = document.getElementById('successModal');
    const closeModalBtn = document.querySelector('.close-modal');

    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            formMessage.textContent = 'Przetwarzanie...';
            formMessage.className = 'form-message';

            const formData = new FormData(bookingForm);
            const data = Object.fromEntries(formData.entries());
            
            // Format phone number (optional basic strip)
            data.phone = data.phone.replace(/\s/g, '');

            try {
                const res = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await res.json();
                
                if (res.ok) {
                    // Get slot text before resetting the form
                    const slotText = slotSelect.options[slotSelect.selectedIndex].text;
                    
                    bookingForm.reset();
                    formMessage.textContent = '';
                    
                    // Show modal
                    document.getElementById('modalDetails').innerHTML = `
                        <strong>Hulajnoga:</strong> ${data.model} <br>
                        <strong>Termin:</strong> ${slotText}
                    `;
                    modal.classList.add('active');
                    
                    // Reload slots
                    loadSlots();
                } else {
                    formMessage.textContent = result.error || 'Wystąpił błąd.';
                    formMessage.className = 'form-message error';
                }
            } catch (err) {
                formMessage.textContent = 'Błąd połączenia z serwerem.';
                formMessage.className = 'form-message error';
            }
        });
    }

    // Modal Close
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});
