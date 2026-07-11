  // TODO: Replace this with your actual GAS Web App URL after deployment
  const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxmRK93fER7nIibHHNuO42RJ0T-7EYDAe1JhJVvLdr7D34yrNF3gPL9yve6Yuqq7-yR/exec';

  let appData = {
    projects: [],
    news: [],
    stats: [],
    knowledge: [],
    about: []
  };

  document.addEventListener('DOMContentLoaded', function() {
    checkSession();
    initApp();
  });

  /**
   * Check Session on load
   */
  function checkSession() {
    const user = localStorage.getItem('node_user');
    if (user) {
      window.currentUser = JSON.parse(user);
      updateUserUI();
    }
  }

  function updateUserUI() {
    if (window.currentUser) {
      document.getElementById('nav-login-btn').classList.add('d-none');
      document.getElementById('nav-user-menu').classList.remove('d-none');
      document.getElementById('nav-event-record').classList.remove('d-none');
      
      // Update Info Card if on event-record page
      const infoFullname = document.getElementById('info-fullname');
      if (infoFullname) {
        infoFullname.innerText = window.currentUser.fullname;
        document.getElementById('info-village').innerText = window.currentUser.village || '-';
        document.getElementById('info-role').innerText = window.currentUser.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ใช้งานทั่วไป';
      }
    } else {
      document.getElementById('nav-login-btn').classList.remove('d-none');
      document.getElementById('nav-user-menu').classList.add('d-none');
      document.getElementById('nav-event-record').classList.add('d-none');
    }
  }

  /**
   * Handle Login
   */
  async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    Swal.fire({
      title: 'กำลังตรวจสอบ...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const formData = new URLSearchParams();
      formData.append('action', 'checkLogin');
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: formData
      });

      const res = await response.json();
      
      if (res.success) {
        window.currentUser = res.user;
        localStorage.setItem('node_user', JSON.stringify(res.user));
        updateUserUI();
        Swal.fire({
          icon: 'success',
          title: 'เข้าสู่ระบบสำเร็จ',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          showPage('event-record');
          renderEvents();
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          text: res.message
        });
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }

  function logout() {
    window.currentUser = null;
    localStorage.removeItem('node_user');
    updateUserUI();
    showPage('home');
  }

  /**
   * Render Events Table from local data (Optimistic UI support)
   */
  function renderEventsTable() {
    const container = document.getElementById('event-table-body');
    if (!container) return;

    if (!appData.events || appData.events.length === 0) {
      container.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">ไม่พบข้อมูลกิจกรรม</td></tr>';
      return;
    }

    container.innerHTML = appData.events.map(e => {
      const isApproved = e.approve && (e.approve.toString().toLowerCase() === 'true' || e.approve === 'TRUE');
      const eventId = e.ID || e.id;
      
      let budgetAmount = '-';
      try {
        const b = typeof e['งบประมาณ'] === 'string' ? JSON.parse(e['งบประมาณ'] || '{}') : (e['งบประมาณ'] || {});
        if (b.income) budgetAmount = '฿' + parseFloat(b.income).toLocaleString();
      } catch(err) {}

      return `
        <tr>
          <td class="ps-4">
            <div class="fw-bold text-primary">${e['ชื่อกิจกรรม'] || '-'}</div>
            <div class="small text-muted"><i class="bi bi-geo-alt me-1"></i>${e.village || '-'}</div>
          </td>
          <td>
            <div class="fw-bold"><i class="bi bi-calendar3 me-2 text-primary"></i>${e['วันที่จัดกิจกรรม'] || '-'} | ${e['เวลาเริ่ม'] || '-'} - ${e['เวลาสิ้นสุด'] || '-'} น.</div>
            <div class="small text-muted"><i class="bi bi-cash-stack me-2"></i>งบประมาณ: ${budgetAmount}</div>
          </td>
          <td><i class="bi bi-pin-map me-2 text-danger"></i>${e['สถานที่'] || '-'}</td>
          <td><i class="bi bi-people me-2 text-info"></i>${e['กลุ่มเป้าหมาย'] || '-'}</td>
          <td class="text-end pe-4">
            <div class="d-flex justify-content-end gap-3">
              <button class="btn btn-sm btn-light border py-1" onclick="generateEventPDF('${eventId}')" title="สร้าง PDF">
                <i class="bi bi-file-earmark-pdf text-danger"></i>
              </button>
              <button class="btn btn-sm btn-light border py-1" onclick="openPreviewModal('${eventId}')" title="ดูรายละเอียดกิจกรรม">
                <i class="bi bi-eye text-primary"></i>
              </button>
              ${!isApproved ? `
                <button class="btn btn-sm btn-light border py-1" onclick="openEventModal('${eventId}')" title="แก้ไข">
                  <i class="bi bi-pencil-square text-primary"></i>
                </button>
                <button class="btn btn-sm btn-light border py-1" onclick="handleDeleteEvent('${eventId}')" title="ลบ">
                  <i class="bi bi-trash3 text-danger"></i>
                </button>
                <button class="btn btn-sm btn-primary-th px-3 py-1" onclick="handleApproveEvent('${eventId}', event)">
                  <i class="bi bi-check-circle me-1"></i> ยืนยัน
                </button>
              ` : `
                <span class="badge rounded-pill bg-success-subtle text-success border border-success px-3 py-2">
                  <i class="bi bi-shield-check me-1"></i> ยืนยันข้อมูลแล้ว
                </span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  /**
   * Fetch Events from Server
   */
  async function renderEvents() {
    if (!window.currentUser) return;
    
    const container = document.getElementById('event-table-body');
    if (!container) return;

    // Only show spinner if we don't have data yet (to avoid flickering with Optimistic UI)
    if (!appData.events || appData.events.length === 0) {
      container.innerHTML = '<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';
    }

    try {
      const formData = new URLSearchParams();
      formData.append('action', 'getAppData');
      formData.append('user', JSON.stringify(window.currentUser));

      const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      appData.events = data.events || [];
      renderEventsTable();
    } catch (err) {
      console.error('Fetch events error:', err);
      // If we already have data, don't show error, just keep current UI
      if (!appData.events || appData.events.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-danger">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
      }
    }
  }

  /**
   * Preview Modal Handling
   */
  function openPreviewModal(id) {
    const e = appData.events.find(item => (item.ID || item.id) === id);
    if (!e) return;

    // Helper to get value by key or lowercase key
    const getVal = (key) => e[key] || e[key.toLowerCase()] || '';

    let budget = { income: 0, expenses: [0, 0, 0, 0, 0, 0] };
    try {
      budget = JSON.parse(getVal('งบประมาณ') || '{}');
    } catch (err) { }

    const totalExpense = (budget.expenses || []).reduce((a, b) => a + b, 0);
    const balance = (budget.income || 0) - totalExpense;

    const content = `
      <div class="preview-report">
        <div class="text-center mb-5 pb-3 border-bottom border-2" style="border-color: var(--primary) !important">
          <h4 class="fw-bold text-success mb-1">รายงานสรุปผลการจัดกิจกรรม</h4>
          <div class="text-muted small">หน่วยจัดการจังหวัดเชียงราย (Node มุ่งเป้า สสส.)</div>
        </div>

        <div class="row g-4 mb-5">
          <div class="col-sm-4 fw-bold text-muted">ชื่อกิจกรรม:</div>
          <div class="col-sm-8">${getVal('ชื่อกิจกรรม') || '-'}</div>
          
          <div class="col-sm-4 fw-bold text-muted">วันที่จัดกิจกรรม:</div>
          <div class="col-sm-8">${toThaiDate(getVal('วันที่จัดกิจกรรม'))}</div>
          
          <div class="col-sm-4 fw-bold text-muted">เวลา:</div>
          <div class="col-sm-8">${getVal('เวลาเริ่ม') || '-'} น. ถึง ${getVal('เวลาสิ้นสุด') || '-'} น.</div>
          
          <div class="col-sm-4 fw-bold text-muted">สถานที่:</div>
          <div class="col-sm-8">${getVal('สถานที่') || '-'}</div>
          
          <div class="col-sm-4 fw-bold text-muted">ชุมชน/หมู่บ้าน:</div>
          <div class="col-sm-8">${e.village || '-'}</div>

          <div class="col-sm-4 fw-bold text-muted">กลุ่มเป้าหมาย:</div>
          <div class="col-sm-8">${getVal('กลุ่มเป้าหมาย') || '-'}</div>
        </div>

        <div class="mb-5">
          <h6 class="fw-bold text-success border-start border-4 border-secondary ps-2 mb-2">รายละเอียดกิจกรรม</h6>
          <div style="white-space: pre-wrap; line-height: 1.6;">${getVal('รายละเอียดกิจกรรม') || '-'}</div>
        </div>

        <div class="mb-5">
          <h6 class="fw-bold text-success border-start border-4 border-secondary ps-2 mb-2">ผลที่เกิดขึ้นจากการทำกิจกรรม</h6>
          <div style="white-space: pre-wrap; line-height: 1.6;">${getVal('ผลที่เกิดขึ้นจากการทำกิจกรรม') || '-'}</div>
        </div>

        <div class="mb-5">
          <h6 class="fw-bold text-success border-start border-4 border-secondary ps-2 mb-3">ภาพประกอบกิจกรรม</h6>
          <div class="row g-2">
            ${[1, 2, 3, 4].map(i => {
              const img = getVal(`ภาพกิจกรรม${i}`);
              return img ? `
                <div class="col-md-3 col-6">
                  <div class="position-relative">
                    <img src="${img}" class="img-fluid rounded border shadow-sm w-100" style="height: 120px; object-fit: cover; cursor: pointer;" onclick="window.open(this.src, '_blank')">
                  </div>
                </div>
              ` : '';
            }).join('')}
          </div>
        </div>

        <div class="mb-5">
          <h6 class="fw-bold text-success border-start border-4 border-secondary ps-2 mb-3">สรุปงบประมาณ</h6>
          <div class="table-responsive">
            <table class="table table-sm table-bordered">
              <thead class="bg-light">
                <tr>
                  <th>รายการ</th>
                  <th class="text-end" style="width: 150px;">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="fw-bold">
                  <td>รายรับ (งบประมาณที่ได้รับ)</td>
                  <td class="text-end">${(budget.income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr class="bg-light fw-bold">
                  <td colspan="2">รายจ่าย</td>
                </tr>
                <tr>
                  <td class="ps-4">1. ค่าตอบแทน (วิทยากร/อาสาสมัคร/ประสานงาน)</td>
                  <td class="text-end">${(budget.expenses?.[0] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td class="ps-4">2. ค่าจ้าง (จัดทำข้อมูล/ทำของ)</td>
                  <td class="text-end">${(budget.expenses?.[1] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td class="ps-4">3. ค่าใช้สอย (พาหนะ/ที่พัก/อาหาร/เช่าสถานที่)</td>
                  <td class="text-end">${(budget.expenses?.[2] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td class="ps-4">4. ค่าวัสดุ (เครื่องเขียน/สำนักงาน/เผยแพร่)</td>
                  <td class="text-end">${(budget.expenses?.[3] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td class="ps-4">5. ค่าสาธารณูปโภค (ไฟฟ้า/น้ำ/โทรศัพท์/ไปรษณีย์)</td>
                  <td class="text-end">${(budget.expenses?.[4] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td class="ps-4">6. ค่าอื่นๆ</td>
                  <td class="text-end">${(budget.expenses?.[5] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr class="bg-light fw-bold">
                  <td class="text-end">รวมรายจ่ายทั้งสิ้น</td>
                  <td class="text-end text-danger">${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr class="table-warning fw-bold">
                  <td class="text-end">งบประมาณคงเหลือ (ยอดยกไป)</td>
                  <td class="text-end" style="color: var(--secondary-dark)">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('preview-content').innerHTML = content;
    const modal = new bootstrap.Modal(document.getElementById('previewModal'));
    modal.show();
  }

  /**
   * Event Modal Handling
   */
  function openEventModal(id = null) {
    const form = document.getElementById('eventForm');
    form.reset();
    document.getElementById('event-id').value = id || '';
    
    // Reset budget
    document.getElementById('budget-income').value = '';
    document.querySelectorAll('.expense-input').forEach(input => input.value = '');
    calculateFixedBudget();
    
    // Reset images
    for (let i = 1; i <= 4; i++) {
      document.getElementById(`event-img-${i}`).value = '';
      document.getElementById(`img-preview-${i}`).classList.add('d-none');
      document.getElementById(`btn-remove-${i}`).classList.add('d-none');
      document.getElementById(`img-preview-box-${i}`).querySelector('.bi-camera').classList.remove('d-none');
      document.getElementById(`img-preview-box-${i}`).querySelector('span').classList.remove('d-none');
    }

    if (id) {
      const e = appData.events.find(item => (item.ID || item.id) === id);
      console.log('Edit event data:', e); // Debug log
      if (e) {
        document.getElementById('eventModalTitle').innerText = 'แก้ไขข้อมูลกิจกรรม';
        document.getElementById('event-name').value = e['ชื่อกิจกรรม'] || e['ชื่อกิจกรรม'.toLowerCase()] || '';
        document.getElementById('event-date').value = e['วันที่จัดกิจกรรม'] || e['วันที่จัดกิจกรรม'.toLowerCase()] || '';
        document.getElementById('event-start-time').value = formatTimeForInput(e['เวลาเริ่ม'] || e['เวลาเริ่ม'.toLowerCase()]);
        document.getElementById('event-end-time').value = formatTimeForInput(e['เวลาสิ้นสุด'] || e['เวลาสิ้นสุด'.toLowerCase()]);
        document.getElementById('event-location').value = e['สถานที่'] || e['สถานที่'.toLowerCase()] || '';
        document.getElementById('event-target').value = e['กลุ่มเป้าหมาย'] || e['กลุ่มเป้าหมาย'.toLowerCase()] || '';
        document.getElementById('event-detail').value = e['รายละเอียดกิจกรรม'] || e['รายละเอียดกิจกรรม'.toLowerCase()] || '';
        document.getElementById('event-result').value = e['ผลที่เกิดขึ้นจากการทำกิจกรรม'] || e['ผลที่เกิดขึ้นจากการทำกิจกรรม'.toLowerCase()] || '';
        
        // Trigger resize
        setTimeout(() => {
          handleTextareaInput(document.getElementById('event-detail'));
          handleTextareaInput(document.getElementById('event-result'));
        }, 200);
        
        // Load images
        for (let i = 1; i <= 4; i++) {
          const img = e[`ภาพกิจกรรม${i}`] || e[`ภาพกิจกรรม${i}`.toLowerCase()];
          if (img) {
            setPreview(i, img);
          }
        }

        // Load budget
        try {
          const budget = JSON.parse(e['งบประมาณ'] || e['งบประมาณ'.toLowerCase()] || '{}');
          document.getElementById('budget-income').value = budget.income || '';
          const expenseInputs = document.querySelectorAll('.expense-input');
          (budget.expenses || []).forEach((val, idx) => {
            if (expenseInputs[idx]) expenseInputs[idx].value = val || '';
          });
          calculateFixedBudget();
        } catch (err) {
          console.error('Error parsing budget', err);
        }
      }
    } else {
      document.getElementById('eventModalTitle').innerText = 'บันทึกกิจกรรมใหม่';
      // Reset height
      document.getElementById('event-detail').style.height = '120px';
      document.getElementById('event-result').style.height = '120px';
    }

    const modalEl = document.getElementById('eventModal');
    modalEl.removeAttribute('aria-hidden'); // Fix aria-hidden focus error
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  /**
   * Image Preview & Handling with Compression
   */
  async function previewImage(event, index) {
    const file = event.target.files[0];
    if (!file) return;

    // Show loading state by adding a spinner to the box without destroying content
    const box = document.getElementById(`img-preview-box-${index}`);
    const cameraIcon = box.querySelector('.bi-camera');
    const spanText = box.querySelector('span');
    
    // Create or find a spinner
    let spinner = box.querySelector('.spinner-container');
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.className = 'spinner-container text-center';
      spinner.innerHTML = '<div class="spinner-border text-primary spinner-border-sm"></div><div class="small mt-1">กำลังย่อรูป...</div>';
      box.appendChild(spinner);
    }
    
    // Hide camera and text
    if (cameraIcon) cameraIcon.classList.add('d-none');
    if (spanText) spanText.classList.add('d-none');
    spinner.classList.remove('d-none');

    try {
      // ปรับปรุงระบบบีบอัดรูปภาพให้ย่อขนาดอัตโนมัติจนกว่าจะบันทึกลง Google Sheets ได้
      let maxWidth = 800;
      let maxHeight = 600;
      let quality = 0.7;
      let compressedBase64 = await compressImage(file, maxWidth, maxHeight, quality);
      
      // วนลูปบีบอัดจนกว่าขนาดจะน้อยกว่า 49,000 ตัวอักษร (ขีดจำกัด Google Sheets คือ 50,000)
      let attempts = 0;
      while (compressedBase64.length > 49000 && attempts < 5) {
        attempts++;
        maxWidth *= 0.8;
        maxHeight *= 0.8;
        quality *= 0.8;
        console.log(`Image still large (${compressedBase64.length}), retrying compression attempt ${attempts}...`);
        compressedBase64 = await compressImage(file, maxWidth, maxHeight, quality);
      }
      
      // Hide spinner before previewing
      spinner.classList.add('d-none');
      setPreview(index, compressedBase64);
    } catch (err) {
      console.error('Compression Error:', err);
      Swal.fire('Error', 'ไม่สามารถประมวลผลรูปภาพได้', 'error');
      if (cameraIcon) cameraIcon.classList.remove('d-none');
      if (spanText) spanText.classList.remove('d-none');
      spinner.classList.add('d-none');
    }
  }

  function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Fill background white for JPEGs (to avoid black background on transparent PNGs)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Use JPEG for better compression
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }

  function setPreview(index, base64) {
    document.getElementById(`event-img-${index}`).value = base64;
    const preview = document.getElementById(`img-preview-${index}`);
    preview.src = base64;
    preview.classList.remove('d-none');
    document.getElementById(`btn-remove-${index}`).classList.remove('d-none');
    document.getElementById(`img-preview-box-${index}`).querySelector('.bi-camera').classList.add('d-none');
    document.getElementById(`img-preview-box-${index}`).querySelector('span').classList.add('d-none');
  }

  function removeImage(event, index) {
    event.stopPropagation();
    document.getElementById(`event-img-${index}`).value = '';
    document.getElementById(`img-input-${index}`).value = '';
    document.getElementById(`img-preview-${index}`).classList.add('d-none');
    document.getElementById(`btn-remove-${index}`).classList.add('d-none');
    document.getElementById(`img-preview-box-${index}`).querySelector('.bi-camera').classList.remove('d-none');
    document.getElementById(`img-preview-box-${index}`).querySelector('span').classList.remove('d-none');
  }

  /**
   * Fixed Budget Calculation
   */
  function calculateFixedBudget() {
    const income = parseFloat(document.getElementById('budget-income').value) || 0;
    let totalExpense = 0;
    document.querySelectorAll('.expense-input').forEach(input => {
      totalExpense += parseFloat(input.value) || 0;
    });
    
    const balance = income - totalExpense;
    
    document.getElementById('total-expenses').innerText = totalExpense.toLocaleString(undefined, {minimumFractionDigits: 2});
    document.getElementById('budget-balance').innerText = balance.toLocaleString(undefined, {minimumFractionDigits: 2});
  }

  /**
   * Save Event
   */
  async function handleSaveEvent() {
    const id = document.getElementById('event-id').value;
    const name = document.getElementById('event-name').value;
    const date = document.getElementById('event-date').value;
    
    if (!name || !date) {
      Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อกิจกรรมและวันที่', 'warning');
      return;
    }

    // Show loading state
    Swal.fire({
      title: 'กำลังบันทึก...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Collect fixed budget data
    const expenses = [];
    document.querySelectorAll('.expense-input').forEach(input => {
      expenses.push(parseFloat(input.value) || 0);
    });

    const budgetData = {
      income: parseFloat(document.getElementById('budget-income').value) || 0,
      expenses: expenses
    };

    const eventData = {
      'ID': id,
      'ชื่อกิจกรรม': name,
      'วันที่จัดกิจกรรม': date,
      'เวลาเริ่ม': formatTimeForInput(document.getElementById('event-start-time').value),
      'เวลาสิ้นสุด': formatTimeForInput(document.getElementById('event-end-time').value),
      'สถานที่': document.getElementById('event-location').value,
      'กลุ่มเป้าหมาย': document.getElementById('event-target').value,
      'รายละเอียดกิจกรรม': document.getElementById('event-detail').value,
      'ผลที่เกิดขึ้นจากการทำกิจกรรม': document.getElementById('event-result').value,
      'ภาพกิจกรรม1': document.getElementById('event-img-1').value,
      'ภาพกิจกรรม2': document.getElementById('event-img-2').value,
      'ภาพกิจกรรม3': document.getElementById('event-img-3').value,
      'ภาพกิจกรรม4': document.getElementById('event-img-4').value,
      'งบประมาณ': JSON.stringify(budgetData)
    };

    try {
      const formData = new URLSearchParams();
      formData.append('action', 'saveEvent');
      formData.append('eventData', JSON.stringify(eventData));
      formData.append('currentUser', JSON.stringify(window.currentUser));

      const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: formData
      });

      const res = await response.json();
      
      if (res.success) {
        bootstrap.Modal.getInstance(document.getElementById('eventModal')).hide();
        // Update UI after successful save
        await renderEvents();
        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ!',
          text: res.message,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire('เกิดข้อผิดพลาด', res.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  }

  /**
   * Delete Event
   */
  async function handleDeleteEvent(id) {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "คุณไม่สามารถย้อนกลับรายการนี้ได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#039780',
      confirmButtonText: 'ยืนยันการลบ',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Show loading state
        Swal.fire({
          title: 'กำลังลบ...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        try {
          const formData = new URLSearchParams();
          formData.append('action', 'deleteEvent');
          formData.append('eventId', id);
          formData.append('currentUser', JSON.stringify(window.currentUser));

          const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: formData
          });

          const res = await response.json();
          
          if (res.success) {
            await renderEvents();
            Swal.fire({
              icon: 'success',
              title: 'ลบสำเร็จ!',
              text: res.message,
              timer: 2000,
              showConfirmButton: false
            });
          } else {
            Swal.fire('Error', res.message, 'error');
          }
        } catch (err) {
          Swal.fire('Error', err.message, 'error');
        }
      }
    });
  }

  async function handleApproveEvent(id, event) {
    Swal.fire({
      title: 'ยืนยันข้อมูล?',
      text: "หลังจากยืนยันแล้ว คุณจะไม่สามารถแก้ไขหรือลบข้อมูลได้อีก",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Show loading state
        Swal.fire({
          title: 'กำลังยืนยัน...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });

        try {
          const formData = new URLSearchParams();
          formData.append('action', 'approveEvent');
          formData.append('eventId', id);
          formData.append('currentUser', JSON.stringify(window.currentUser));

          const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: formData
          });

          const res = await response.json();
          
          if (res.success) {
            await renderEvents();
            Swal.fire({
              icon: 'success',
              title: 'ยืนยันสำเร็จ!',
              text: res.message,
              timer: 2000,
              showConfirmButton: false
            });
          } else {
            Swal.fire('Error', res.message, 'error');
          }
        } catch (err) {
          Swal.fire('Error', err.message, 'error');
        }
      }
    });
  }

  function generateEventPDF(id) {
    const e = appData.events.find(item => (item.ID || item.id) === id);
    if (!e) return;

    // Helper to get value by key or lowercase key
    const getVal = (key) => e[key] || e[key.toLowerCase()] || '';

    let budget = { income: 0, expenses: [0, 0, 0, 0, 0, 0] };
    try {
      budget = JSON.parse(getVal('งบประมาณ') || '{}');
    } catch (err) { }

    const totalExpense = (budget.expenses || []).reduce((a, b) => a + b, 0);
    const balance = (budget.income || 0) - totalExpense;

    // Create PDF content with proper styling for Thai fonts and page breaks
    const pdfContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@100;200;300;400;500;600&family=Sarabun:wght@300;400;700&display=swap" rel="stylesheet">
        <style>
          * {
            font-family: 'Sarabun', 'Kanit', sans-serif;
            box-sizing: border-box;
          }
          body {
            padding: 20px;
            font-size: 14px;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid #039780;
          }
          .header h1 {
            color: #039780;
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          .header p {
            color: #666;
            margin: 0;
            font-size: 14px;
          }
          .section {
            margin-bottom: 20px;
          }
          .section.no-break {
            page-break-inside: avoid;
          }
          .section-title {
            font-weight: bold;
            color: #039780;
            border-left: 4px solid #ED7E23;
            padding-left: 10px;
            margin-bottom: 15px;
            font-size: 16px;
          }
          .info-row {
            display: flex;
            margin-bottom: 8px;
          }
          .info-label {
            width: 180px;
            font-weight: bold;
            color: #666;
          }
          .info-value {
            flex: 1;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            page-break-inside: avoid;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background: #f8f9fa;
            font-weight: bold;
          }
          .text-end {
            text-align: right;
          }
          .bg-light {
            background: #f8f9fa;
          }
          .fw-bold {
            font-weight: bold;
          }
          .images-container {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
          }
          .image-item {
            width: calc(50% - 5px);
            page-break-inside: avoid;
          }
          .image-item img {
            width: 100%;
            height: auto;
            border-radius: 8px;
            border: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>รายงานสรุปผลการจัดกิจกรรม</h1>
          <p>หน่วยจัดการจังหวัดเชียงราย (Node มุ่งเป้า สสส.)</p>
        </div>

        <div class="section no-break">
          <div class="section-title">ข้อมูลทั่วไป</div>
          <div class="info-row">
            <div class="info-label">ชื่อกิจกรรม:</div>
            <div class="info-value">${getVal('ชื่อกิจกรรม') || '-'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">วันที่จัดกิจกรรม:</div>
            <div class="info-value">${toThaiDate(getVal('วันที่จัดกิจกรรม'))}</div>
          </div>
          <div class="info-row">
            <div class="info-label">เวลา:</div>
            <div class="info-value">${getVal('เวลาเริ่ม') || '-'} น. ถึง ${getVal('เวลาสิ้นสุด') || '-'} น.</div>
          </div>
          <div class="info-row">
            <div class="info-label">สถานที่:</div>
            <div class="info-value">${getVal('สถานที่') || '-'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">ชุมชน/หมู่บ้าน:</div>
            <div class="info-value">${e.village || '-'}</div>
          </div>
          <div class="info-row">
            <div class="info-label">กลุ่มเป้าหมาย:</div>
            <div class="info-value">${getVal('กลุ่มเป้าหมาย') || '-'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">รายละเอียดกิจกรรม1</div>
          <div style="white-space: pre-wrap; line-height: 1.8; background: none; padding: 0;">${getVal('รายละเอียดกิจกรรม') || '-'}</div>
        </div>

        <div class="section">
          <div class="section-title">ผลที่เกิดขึ้นจากการทำกิจกรรม</div>
          <div style="white-space: pre-wrap; line-height: 1.8; background: none; padding: 0;">${getVal('ผลที่เกิดขึ้นจากการทำกิจกรรม') || '-'}</div>
        </div>

        ${([1,2,3,4].some(i => getVal(`ภาพกิจกรรม${i}`))) ? `
        <div class="section no-break">
          <div class="section-title">ภาพประกอบกิจกรรม</div>
          <div class="images-container">
            ${[1,2,3,4].map(i => {
              const img = getVal(`ภาพกิจกรรม${i}`);
              return img ? `
                <div class="image-item">
                  <img src="${img}" alt="ภาพกิจกรรม ${i}">
                </div>
              ` : '';
            }).join('')}
          </div>
        </div>
        ` : ''}

        <div class="section no-break">
          <div class="section-title">สรุปงบประมาณ</div>
          <table>
            <thead>
              <tr>
                <th>รายการ</th>
                <th class="text-end">จำนวนเงิน (บาท)</th>
              </tr>
            </thead>
            <tbody>
              <tr class="fw-bold">
                <td>รายรับ (งบประมาณที่ได้รับ)</td>
                <td class="text-end">${(budget.income || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="bg-light fw-bold">
                <td colspan="2">รายจ่าย</td>
              </tr>
              <tr>
                <td class="ps-4">1. ค่าตอบแทน (วิทยากร/อาสาสมัคร/ประสานงาน)</td>
                <td class="text-end">${(budget.expenses?.[0] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td class="ps-4">2. ค่าจ้าง (จัดทำข้อมูล/ทำของ)</td>
                <td class="text-end">${(budget.expenses?.[1] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td class="ps-4">3. ค่าใช้สอย (พาหนะ/ที่พัก/อาหาร/เช่าสถานที่)</td>
                <td class="text-end">${(budget.expenses?.[2] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td class="ps-4">4. ค่าวัสดุ (เครื่องเขียน/สำนักงาน/เผยแพร่)</td>
                <td class="text-end">${(budget.expenses?.[3] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td class="ps-4">5. ค่าสาธารณูปโภค (ไฟฟ้า/น้ำ/โทรศัพท์/ไปรษณีย์)</td>
                <td class="text-end">${(budget.expenses?.[4] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td class="ps-4">6. ค่าอื่นๆ</td>
                <td class="text-end">${(budget.expenses?.[5] || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="bg-light fw-bold">
                <td class="text-end">รวมรายจ่ายทั้งสิ้น</td>
                <td class="text-end text-danger">${totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr class="table-warning fw-bold">
                <td class="text-end">งบประมาณคงเหลือ (ยอดยกไป)</td>
                <td class="text-end">${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;

    const element = document.getElementById('pdf-template-container');
    element.innerHTML = pdfContent;

    const opt = {
      margin: 10,
      filename: `รายงานกิจกรรม_${e['ชื่อกิจกรรม'] || 'กิจกรรม'}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        letterRendering: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save();
  }

  function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, {type: contentType});
  }

  /**
   * Initialize Application
   */
  async function initApp() {
    // 1. Caching: Try to load from localStorage first for instant display
    const cachedData = localStorage.getItem('appData_cache');
    if (cachedData) {
      try {
        appData = JSON.parse(cachedData);
        populateFilters();
        renderHome();
        renderProjects();
        renderDashboard();
        renderNews();
        renderKnowledge();
        renderAbout();
        
        // If logged in, also render events from cache
        if (window.currentUser) {
          renderEventsTable();
        }
      } catch (e) {
        console.error('Error parsing cached data', e);
      }
    }

    // 2. Fetch Fresh Data from Server in background
    try {
      const formData = new URLSearchParams();
      formData.append('action', 'getAppData');
      if (window.currentUser) {
        formData.append('user', JSON.stringify(window.currentUser));
      }

      const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      appData = data;
      
      // Update cache
      localStorage.setItem('appData_cache', JSON.stringify(appData));
      
      populateFilters();
      renderHome();
      renderProjects();
      renderDashboard();
      renderNews();
      renderKnowledge();
      renderAbout();
      
      if (window.currentUser) {
        renderEventsTable();
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      // Only show error if we have no cached data at all
      if (!cachedData) {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
          confirmButtonColor: '#039780'
        });
      }
    }
  }

  /**
   * Navigation Logic
   */
  function showPage(pageId) {
    // Auth check for protected pages
    if (pageId === 'event-record' && !window.currentUser) {
      pageId = 'login';
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      const onclickAttr = link.getAttribute('onclick') || '';
      if (onclickAttr.indexOf(pageId) !== -1) {
        link.classList.add('active');
      }
    });

    // Update active page content
    document.querySelectorAll('.page-content').forEach(page => {
      page.classList.remove('active');
    });
    
    const activePage = document.getElementById(pageId);
    if (activePage) {
      activePage.classList.add('active');
      window.scrollTo(0, 0);
    }

    // Auto-collapse navbar on mobile
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      const bsCollapse = new bootstrap.Collapse(navbarCollapse);
      bsCollapse.hide();
    }

    // Special handling for charts when dashboard is shown
    if (pageId === 'dashboard') {
      setTimeout(renderDashboard, 100);
    }

    // Special handling for event record
    if (pageId === 'event-record') {
      renderEvents();
    }
  }

  /**
   * Populate Dropdown Filters Dynamically from Project Data
   */
  function populateFilters() {
    const districtFilter = document.getElementById('filterDistrict');
    const typeFilter = document.getElementById('filterType');
    
    if (!districtFilter || !typeFilter) return;
    
    // Extract unique values
    const districts = [...new Set(appData.projects.map(p => p.district).filter(Boolean))].sort();
    const types = [...new Set(appData.projects.map(p => p.type).filter(Boolean))].sort();
    
    // Reset and add "All" option
    districtFilter.innerHTML = '<option value="">ทุกอำเภอ</option>';
    typeFilter.innerHTML = '<option value="">ทุกประเภท</option>';
    
    // Add unique districts
    districts.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      districtFilter.appendChild(opt);
    });
    
    // Add unique types
    types.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      typeFilter.appendChild(opt);
    });
  }

  /**
   * Render Home Page Content
   */
  function renderHome() {
    // Render Stats from Dashboard_Stats sheet if available, otherwise calculate from projects
    const statsContainer = document.getElementById('home-stats');
    if (statsContainer) {
      if (appData.stats && appData.stats.length > 0) {
        // Use stats from sheet
        appData.stats.forEach(s => {
          const id = 'stat-' + s.label?.toLowerCase().replace(/\s+/g, '_');
          const element = document.getElementById(id);
          if (element) element.innerText = s.value || '0';
        });
      } else if (appData.projects.length > 0) {
        // Fallback: calculate from projects
        const totalBudget = appData.projects.reduce((sum, p) => sum + (parseFloat(p.budget?.replace(/,/g, '')) || 0), 0);
        const districts = [...new Set(appData.projects.map(p => p.district).filter(Boolean))].length;

        document.getElementById('stat-projects').innerText = appData.projects.length.toLocaleString();
        document.getElementById('stat-budget').innerText = (totalBudget / 1000000).toFixed(1) + 'M';
        document.getElementById('stat-districts').innerText = districts;
      }
    }

    // Render Latest News (Top 3) - combine news and approved events
    const newsContainer = document.getElementById('home-news');
    if (newsContainer) {
      const allItems = [];

      if (appData.news && appData.news.length > 0) {
        appData.news.forEach(n => {
          allItems.push({
            type: 'news',
            title: n.title,
            date: n.date,
            thumbnail: n.thumbnail,
            category: n.category || 'ข่าวสาร',
            id: n.ID || n.id
          });
        });
      }

      if (appData.approvedEvents && appData.approvedEvents.length > 0) {
        appData.approvedEvents.forEach(e => {
          let budgetAmount = '';
          try {
            const b = JSON.parse(e['งบประมาณ'] || '{}');
            if (b.income) budgetAmount = parseFloat(b.income).toLocaleString();
          } catch(err) {}

          allItems.push({
            type: 'event',
            title: e['ชื่อกิจกรรม'],
            date: e['วันที่จัดกิจกรรม'],
            time: e['เวลาเริ่ม'],
            endTime: e['เวลาสิ้นสุด'],
            budget: budgetAmount,
            thumbnail: e['ภาพกิจกรรม1'] || '',
            category: 'กิจกรรมชุมชน',
            village: e.village || '',
            id: e.id || e.ID
          });
        });
      }

      allItems.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });

      const latestItems = allItems.slice(0, 3);
      newsContainer.innerHTML = latestItems.map(item => `
        <div class="col-md-4 mb-4">
          <div class="card-th">
            <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800'}" class="card-th-img" alt="${item.title}">
            <div class="card-th-body">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="card-th-tag mb-0" style="${item.type === 'event' ? 'background: var(--secondary-pastel); color: var(--secondary-dark);' : ''}">${item.category}</span>
                ${item.village ? `<span class="badge bg-light text-primary border border-primary-subtle rounded-pill" style="font-size:0.7rem;"><i class="bi bi-geo-alt me-1"></i>${item.village}</span>` : ''}
              </div>
              <h5 class="news-card-title">${item.title}</h5>
              <p class="text-muted small mb-3">${toThaiDate(item.date)}${item.time ? ' | ' + item.time + (item.endTime ? '-' + item.endTime : '') + ' น.' : ''}${item.budget ? ' | งบ: ฿' + item.budget : ''}</p>
              ${item.type === 'news' ? `
                <button class="btn btn-sm btn-outline-primary-th" onclick="viewNewsDetail('${item.id}')">อ่านต่อ</button>
              ` : `
                <button class="btn btn-sm btn-outline-secondary-th" onclick="viewEventDetail('${item.id}')">อ่านต่อ</button>
              `}
            </div>
          </div>
        </div>
      `).join('');
    }

    // 3. Render 'Update'
    const updateContainer = document.getElementById('home-update');
    if (updateContainer) {
      const allUpdates = (appData.updates || []).filter(item => item.image && item.image.trim() !== "");
      if (allUpdates.length > 0) {
        updateContainer.innerHTML = allUpdates.map(n => `
          <div class="col-md-6 col-lg-4 mb-4"> 
            <div class="shadow-sm h-100 border-0 overflow-hidden">
              <div> 
                <img src="${n.image}" 
                    class="card-img-top object-fit-cover hover-zoom" 
                    alt="กิจกรรมประชาสัมพันธ์"
                    style="cursor: pointer; transition: all 0.3s ease;"
                    onclick="window.open('${n.image}', '_blank')"
                    onerror="this.src='https://placehold.co/500?text=Image+NotFound'">
              </div>
            </div>
          </div>
        `).join('');
      } else {
        updateContainer.innerHTML = '<div class="col-12 text-center text-muted p-5"><i class="bi bi-image-fill display-4 d-block mb-3 opacity-25"></i>ยังไม่มีข้อมูลรูปภาพประชาสัมพันธ์ในขณะนี้</div>';
      }
    }


  }

  /**
   * Render Projects Page Content
   */
  function renderProjects(filteredData) {
    const container = document.getElementById('project-list');
    const data = filteredData || appData.projects;
    
    if (!container) return;

    if (data.length === 0 && !filteredData) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="bi bi-database-exclamation display-1 text-muted mb-4"></i>
          <p class="text-muted fs-5">ไม่พบข้อมูลในระบบ หรือยังไม่ได้ตั้งค่า Google Sheets</p>
          <button class="btn btn-primary-th mt-3" onclick="runSetup()">
            <i class="bi bi-magic me-2"></i>สร้างข้อมูลตัวอย่างอัตโนมัติ
          </button>
        </div>
      `;
      return;
    }
    
    if (data.length === 0 && filteredData) {
      container.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">ไม่พบข้อมูลที่ค้นหา</p></div>';
      return;
    }

    container.innerHTML = data.map(p => `
      <div class="col-md-6 mb-4">
        <div class="card-th">
          <div class="card-th-body">
            <span class="card-th-tag">${p.type || 'ทั่วไป'}</span>
            <h5 class="mb-2">${p.name || 'ชื่อโครงการ'}</h5>
            <p class="mb-1 text-muted fw-bold"><i class="bi bi-geo-alt-fill me-1" style="color: var(--primary)"></i> ${p.district || '-'}</p>
            <p class="mb-3 text-muted"><i class="bi bi-person-fill me-1" style="color: var(--primary)"></i> พี่เลี้ยง : ${p.manager || '-'}</p>
            <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
              <span class="fw-bold" style="color: var(--primary)">฿${p.budget || '0'}</span>
              <button class="btn btn-sm btn-primary-th" onclick="viewProjectDetail('${p.ID || p.id}')">รายละเอียด</button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Filter Projects
   */
  function filterProjects() {
    const searchTerm = document.getElementById('searchProject').value.toLowerCase();
    const districtFilter = document.getElementById('filterDistrict').value;
    const typeFilter = document.getElementById('filterType').value;

    const filtered = appData.projects.filter(p => {
      const matchSearch = p.name?.toLowerCase().includes(searchTerm) || p.manager?.toLowerCase().includes(searchTerm);
      const matchDistrict = !districtFilter || p.district === districtFilter;
      const matchType = !typeFilter || p.type === typeFilter;
      return matchSearch && matchDistrict && matchType;
    });

    renderProjects(filtered);
  }

  /**
   * Render Dashboard Charts & Stats
   */
  let charts = {};
  function renderDashboard() {
    const ctxType = document.getElementById('chartType');
    const ctxDistrict = document.getElementById('chartDistrict');
    
    if (!ctxType || !ctxDistrict) return;

    // 1. ประมวลผลข้อมูลสำหรับวาดกราฟ (ดึงจากโครงการในหน้า Projects)
    const typeCounts = {};
    const districtCounts = {};

    appData.projects.forEach(p => {
      if (p.type) typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
      if (p.district) districtCounts[p.district] = (districtCounts[p.district] || 0) + 1;
    });

    // 2. อัปเดตตัวเลขสรุป (Dashboard Summary Stats) โดยดึงจากชีต Dashboard_Stats เป็นหลัก
    if (appData.stats && appData.stats.length > 0) {
      appData.stats.forEach(s => {
        const label = s.label?.toLowerCase().trim();
        const value = s.value || '0';

        if (label === 'projects') {
          const el = document.getElementById('dash-stat-projects');
          if (el) el.innerText = parseInt(value).toLocaleString('th-TH');
        } 
        else if (label === 'budget') {
          const el = document.getElementById('dash-stat-budget');
          if (el) {
            // ลบคอมม่าออกก่อนเพื่อความถูกต้องในการประมวลผล แล้วจึงใส่กลับด้วย toLocaleString
            const numValue = parseFloat(value.toString().replace(/,/g, '')) || 0;
            el.innerText = '฿' + Math.floor(numValue).toLocaleString('th-TH');
          }
        } 
        else if (label === 'districts') {
          const el = document.getElementById('dash-stat-districts');
          if (el) el.innerText = parseInt(value).toLocaleString('th-TH');
        }
      });
    }

    // 3. จัดการส่วนของกราฟ (Charts)
    if (charts.type) charts.type.destroy();
    if (charts.district) charts.district.destroy();

    Chart.defaults.font.family = "'Prompt', sans-serif";
    Chart.defaults.color = '#636E72';

    // กราฟวงกลม (Type Chart)
    charts.type = new Chart(ctxType, {
      type: 'doughnut',
      data: {
        labels: Object.keys(typeCounts),
        datasets: [{
          data: Object.values(typeCounts),
          backgroundColor: ['#039780', '#ED7E23', '#35AD99', '#F7A072', '#027A68', '#D66A1B'],
          hoverOffset: 15,
          borderWidth: 4,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#2D3436',
            bodyColor: '#636E72',
            borderColor: '#E6F5F2',
            borderWidth: 1,
            padding: 12,
            boxPadding: 8,
            usePointStyle: true,
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const value = context.raw;
                const percentage = ((value / total) * 100).toFixed(1);
                return ` ${context.label}: ${value} โครงการ (${percentage}%)`;
              }
            }
          }
        }
      }
    });

    // กราฟแท่ง (District Chart)
    charts.district = new Chart(ctxDistrict, {
      type: 'bar',
      data: {
        labels: Object.keys(districtCounts),
        datasets: [{
          label: 'จำนวนโครงการ',
          data: Object.values(districtCounts),
          backgroundColor: 'rgba(3, 151, 128, 0.8)',
          hoverBackgroundColor: '#039780',
          borderRadius: 8,
          barThickness: 30
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
            ticks: { stepSize: 1 }
          },
          x: { 
            grid: { display: false },
            ticks: { font: { weight: '500' } }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            titleColor: '#2D3436',
            bodyColor: '#636E72',
            borderColor: '#E6F5F2',
            borderWidth: 1,
            padding: 12
          }
        }
      }
    });
  }

  /**
   * Placeholder Renderers
   */
  function renderNews() {
    const container = document.getElementById('all-news');
    if (!container) return;

    // Combine news and approved events
    const allItems = [];

    // Add news
    if (appData.news && appData.news.length > 0) {
      appData.news.forEach(n => {
        allItems.push({
          type: 'news',
          title: n.title,
          date: n.date,
          thumbnail: n.thumbnail,
          category: n.category || 'ข่าวสาร',
          id: n.ID || n.id
        });
      });
    }

    // Add approved events
    if (appData.approvedEvents && appData.approvedEvents.length > 0) {
      appData.approvedEvents.forEach(e => {
        let budgetAmount = '';
        try {
          const b = JSON.parse(e['งบประมาณ'] || '{}');
          if (b.income) budgetAmount = parseFloat(b.income).toLocaleString();
        } catch(err) {}

        allItems.push({
          type: 'event',
          title: e['ชื่อกิจกรรม'],
          date: e['วันที่จัดกิจกรรม'],
          time: e['เวลาเริ่ม'],
          endTime: e['เวลาสิ้นสุด'],
          budget: budgetAmount,
          thumbnail: e['ภาพกิจกรรม1'] || '',
          category: 'กิจกรรมชุมชน',
          village: e.village || '',
          id: e.id || e.ID
        });
      });
    }

    // Sort by date descending
    allItems.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });

    if (allItems.length === 0) {
      container.innerHTML = '<p class="text-center py-5 text-muted">ไม่มีข้อมูลข่าวสาร</p>';
      return;
    }

    container.innerHTML = allItems.map(item => `
      <div class="col-xl-6 col-lg-6 mb-4">
        <div class="card-th news-card-horizontal">
          <div class="news-card-img-container" style="width: 130px; min-width: 130px;">
            <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800'}" class="news-card-img" alt="${item.title}">
          </div>
          <div class="card-th-body flex-grow-1 d-flex flex-column justify-content-between py-3">
            <div>
              <div class="d-flex justify-content-between align-items-start mb-2">
                <span class="card-th-tag mb-0" style="${item.type === 'event' ? 'background: var(--secondary-pastel); color: var(--secondary-dark);' : ''}">${item.category}</span>
                ${item.village ? `<span class="badge bg-light text-primary border border-primary-subtle rounded-pill"><i class="bi bi-geo-alt me-1"></i>${item.village}</span>` : ''}
              </div>
              <h5 class="news-card-title mb-1">${item.title}</h5>
              <p class="text-muted small mb-2">${toThaiDate(item.date)}${item.time ? ' | ' + item.time + (item.endTime ? '-' + item.endTime : '') + ' น.' : ''}${item.budget ? ' | งบ: ฿' + item.budget : ''}</p>
            </div>
            <div class="text-end">
              ${item.type === 'news' ? `
                <button class="btn btn-sm btn-outline-primary-th px-3" style="font-size: 0.8rem;" onclick="viewNewsDetail('${item.id}')">อ่านต่อ</button>
              ` : `
                <button class="btn btn-sm btn-outline-secondary-th px-3" style="font-size: 0.8rem;" onclick="viewEventDetail('${item.id}')">อ่านต่อ</button>
              `}
            </div>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderKnowledge() {
    const container = document.getElementById('knowledge-list');
    if (!container || !appData.knowledge || appData.knowledge.length === 0) return;

    // Grouping data
    const grouped = {
      'เอกสารวิชาการ': [],
      'สื่อการเรียนรู้': [],
      'อื่นๆ': []
    };

    appData.knowledge.forEach(k => {
      const cat = k.category?.trim();
      if (cat === 'เอกสารวิชาการ') grouped['เอกสารวิชาการ'].push(k);
      else if (cat === 'สื่อการเรียนรู้') grouped['สื่อการเรียนรู้'].push(k);
      else grouped['อื่นๆ'].push(k);
    });

    let html = '';
    
    const renderGroup = (title, items, typeClass, icon, headerClass, btnClass) => {
      if (items.length === 0) return '';
      const colorVar = typeClass === 'learning' ? 'var(--secondary)' : 'var(--primary)';
      
      let groupHtml = `
        <div class="col-12">
          <div class="media-group-header ${headerClass || ''}">
            <div class="media-group-icon" style="background: ${colorVar}">
              <i class="bi ${icon}"></i>
            </div>
            <h4>${title}</h4>
          </div>
        </div>
        <div class="col-12 mb-2">
      `;
      
      groupHtml += items.map(k => `
        <div class="media-item-card ${typeClass}">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div class="d-flex align-items-center flex-grow-1 text-start">
              <div class="me-3">
                <i class="bi bi-file-earmark-text fs-5" style="color: ${colorVar}"></i>
              </div>
              <h6 class="media-item-title">${k.title}</h6>
            </div>
            <div class="ms-auto">
              <a href="${k.link || '#'}" target="_blank" class="btn btn-sm ${btnClass} px-4">
                <i class="bi bi-download me-2"></i> ดาวน์โหลด
              </a>
            </div>
          </div>
        </div>
      `).join('');
      
      groupHtml += `</div>`;
      return groupHtml;
    };

    html += renderGroup('เอกสารวิชาการ', grouped['เอกสารวิชาการ'], 'academic', 'bi-journal-bookmark-fill', '', 'btn-outline-primary-th');
    html += `<div class="col-12"><div class="media-divider"></div></div>`;
    html += renderGroup('สื่อการเรียนรู้', grouped['สื่อการเรียนรู้'], 'learning', 'bi-play-btn-fill', 'learning-header', 'btn-outline-secondary-th');
    
    if (grouped['อื่นๆ'].length > 0) {
      html += `<div class="col-12"><div class="media-divider"></div></div>`;
      html += renderGroup('สื่อสร้างสุขอื่นๆ', grouped['อื่นๆ'], '', 'bi-collection-fill', '', 'btn-outline-primary-th');
    }

    container.innerHTML = html;
  }

  /**
   * Render About Page Content from Sheet (Staff list only)
   */
  function renderAbout() {
    const container = document.getElementById('about-content');
    if (!container) return;

    let html = '';
    
    // 1. Add Org Chart section first
    html += `
      <div class="org-chart-wrapper text-center mb-5">
        <div class="org-chart-inner">
          <div class="org-chart-title">โครงสร้างการบริหารจัดการหน่วยจัดการ</div>
          
          <!-- Level 1: Leader -->
          <div class="org-level-1">
            <div class="org-leader-box">
              <div class="org-leader-img">
                <i class="bi bi-person-fill" style="font-size: 2.2rem;"></i>
              </div>
              <div class="org-leader-info">
                <div class="fw-bold fs-5">นายบรรพต วังวล</div>
                <div class="small opacity-75">หัวหน้าหน่วยจัดการจังหวัดเชียงราย</div>
              </div>
            </div>
            <br>
            <div class="org-duty-box text-start shadow-sm">
              <div class="accent-text fw-bold mb-2"><i class="bi bi-gear-wide-connected me-2"></i>บทบาทหน้าที่หลัก:</div>
              <ul class="small mb-0 ps-3">
                <li>บริหารจัดการภาพรวมหน่วยจัดการ</li>
                <li>ออกแบบการพัฒนาศักยภาพทีมงาน</li>
                <li>เชื่อมประสานภาคียุทธศาสตร์ระดับจังหวัด</li>
              </ul>
            </div>
          </div>

          <div class="org-line-vertical"></div>
          <div class="org-line-horizontal-wrapper">
            <div class="org-line-down"></div>
            <div class="org-line-down"></div>
            <div class="org-line-down"></div>
          </div>

          <!-- Level 2: Teams -->
          <div class="row g-4 mt-1">
            <!-- Team 1: Mentors -->
            <div class="col-lg-4 col-md-6 org-team-col">
              <div class="org-team-card">
                <div class="org-member-badge">6 คน</div>
                <div class="org-team-header">
                  <i class="bi bi-people-fill"></i>
                  <span>ทีมพี่เลี้ยง</span>
                </div>
                <p class="org-team-desc mb-3">รับผิดชอบติดตามหนุนเสริมโครงการย่อย สนับสนุนการพัฒนาข้อเสนอ และสังเคราะห์บทเรียน</p>
                <div class="org-arrow-down"><i class="bi bi-chevron-double-down"></i></div>
                <div class="org-member-list">
                  <div class="org-member-name">นางสาวกมลลักษณ์ คำอวน</div>
                  <div class="org-member-name">นางสาวกรรณิกา คำกาน</div>
                  <div class="org-member-name">นางสาวคะนึงนิตย์ อินต๊ะรัตน์</div>
                  <div class="org-member-name">นายสุรจักษ์ คำชาว</div>
                  <div class="org-member-name">นางสาววิลาวัลย์ ศรีนวลอินทร์</div>
                  <div class="org-member-name">นายวิทยา สอนเสนา</div>
                </div>
              </div>
            </div>

            <!-- Team 2: Finance -->
            <div class="col-lg-4 col-md-6 org-team-col">
              <div class="org-team-card">
                <div class="org-member-badge">1 คน</div>
                <div class="org-team-header">
                  <i class="bi bi-calculator-fill"></i>
                  <span>เจ้าหน้าที่การเงิน</span>
                </div>
                <p class="org-team-desc mb-3">ดูแลระบบบัญชี การเบิกจ่าย และให้คำแนะนำเอกสารการเงินแก่โครงการย่อย</p>
                <div class="org-arrow-down"><i class="bi bi-chevron-double-down"></i></div>
                <div class="org-member-list">
                  <div class="org-member-name finance">นายวโสจน์ สืบสมบัติ</div>
                </div>
              </div>
            </div>

            <!-- Team 3: Academic -->
            <div class="col-lg-4 col-md-12 org-team-col">
              <div class="org-team-card">
                <div class="org-member-badge">1 คน</div>
                <div class="org-team-header">
                  <i class="bi bi-journal-check"></i>
                  <span>ทีมวิชาการ</span>
                </div>
                <p class="org-team-desc mb-3">วิเคราะห์สถานการณ์ปัญหาสุขภาพ ออกแบบการเก็บข้อมูล และประมวลผลลัพธ์</p>
                <div class="org-arrow-down"><i class="bi bi-chevron-double-down"></i></div>
                <div class="org-member-list">
                  <div class="org-member-name academic">นายปฐมพร อ้วนวุฒิ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="media-divider"></div>
      </div>
    `;

    // 2. Add Staff List section
    if (appData.staff && appData.staff.length > 0) {
      html += `
        <div class="staff-section text-center">
          <h3 class="staff-section-title fw-bold">บุคลากรหน่วยจัดการ</h3>
          <div class="row g-4 justify-content-center">
      `;

      html += appData.staff.map(s => `
        <div class="col-xl-3 col-lg-4 col-md-6">
          <div class="staff-card">
            <div class="staff-img-wrapper">
              <img src="${s.image || 'https://www.w3schools.com/howto/img_avatar.png'}" class="staff-img" alt="${s.name}">
            </div>
            <h5 class="staff-name">${s.name}</h5>
            <span class="staff-position">${s.position || 'เจ้าหน้าที่'}</span>
            <div class="staff-contact">
              <i class="bi bi-telephone-fill"></i>
              <span>${s.phone || '-'}</span>
            </div>
          </div>
        </div>
      `).join('');

      html += `
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  }

  /**
   * Run Setup Sample Data
   */
  function runSetup() {
    Swal.fire({
      title: 'สร้างข้อมูลตัวอย่าง?',
      text: 'ระบบจะสร้างชีตใหม่และเติมข้อมูลตัวอย่างให้คุณ (ชีตเดิมชื่อเดียวกันจะถูกล้างข้อมูล)',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#039780',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'กำลังดำเนินการ...',
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading()
        });
        
        // setupSampleData function is not implemented in the backend API yet
        Swal.fire({
          icon: 'info',
          title: 'ขออภัย',
          text: 'ฟีเจอร์นี้ยังไม่พร้อมใช้งานในเวอร์ชันแยก Frontend/Backend',
          confirmButtonColor: '#039780'
        });
      }
    });
  }

  /**
   * Detail Viewers
   */
  function viewProjectDetail(id) {
    const project = appData.projects.find(p => (p.ID || p.id) === id);
    if (!project) return;

    Swal.fire({
      title: project.name,
      html: `
        <div class="text-start mt-3">
          <p><strong>ผู้รับผิดชอบ:</strong> ${project.manager || '-'}</p>
          <p><strong>อำเภอ:</strong> ${project.district || '-'}</p>
          <p><strong>งบประมาณ:</strong> ฿${project.budget || '0'}</p>
          <p><strong>สถานะ:</strong> ${project.status || 'ดำเนินการอยู่'}</p>
          <hr>
          <p><strong>รายละเอียด:</strong><br>${project.description || 'ไม่มีข้อมูลเพิ่มเติม'}</p>
        </div>
      `,
      confirmButtonText: 'ปิด',
      confirmButtonColor: '#039780'
    });
  }

  /**
   * Check if a string is likely an image URL
   */
  function isImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const cleanUrl = url.split('?')[0].split('#')[0]; // Remove query params for extension check
    const isDirectImage = /\.(jpeg|jpg|gif|png|webp|bmp|svg)$/i.test(cleanUrl);
    const isServiceImage = url.includes('images.unsplash.com') || 
                          url.includes('drive.google.com/thumbnail') || 
                          url.includes('lh3.googleusercontent.com');
    return isDirectImage || isServiceImage;
  }

  function toThaiDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const months = [
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
      ];
      
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear() + 543;
      
      return `${day} ${month} ${year}`;
    } catch (e) {
      return dateStr;
    }
  }

  function viewEventDetail(id) {
    const event = appData.events.find(e => (e.ID || e.id) === id) || (appData.approvedEvents && appData.approvedEvents.find(e => (e.ID || e.id) === id));
    if (!event) return;

    let budgetHtml = '';
    try {
      const b = JSON.parse(event['งบประมาณ'] || '{}');
      const income = parseFloat(b.income) || 0;
      const expenses = b.expenses || [];
      const expenseLabels = [
        '1. ค่าตอบแทน (วิทยากร/อาสาสมัคร/ประสานงาน)',
        '2. ค่าจ้าง (จัดทำข้อมูล/ทำของ)',
        '3. ค่าใช้สอย (พาหนะ/ที่พัก/ประชุม/อาหาร/สถานที่)',
        '4. ค่าวัสดุ (เครื่องเขียน/สำนักงาน/โฆษณา)',
        '5. ค่าสาธารณูปโภค (ไฟฟ้า/น้ำ/โทรศัพท์/ไปรษณีย์)',
        '6. ค่าอื่นๆ'
      ];

      let totalExpenses = 0;
      let expensesRows = '';
      expenseLabels.forEach((label, i) => {
        const amount = parseFloat(expenses[i]) || 0;
        totalExpenses += amount;
        if (amount > 0) {
          expensesRows += `
            <tr>
              <td class="small">${label}</td>
              <td class="text-end small">฿${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          `;
        }
      });

      const balance = income - totalExpenses;

      budgetHtml = `
        <div class="mt-4 mb-3">
          <h6 class="fw-bold text-primary border-start border-4 border-primary ps-2 mb-3">สรุปงบประมาณกิจกรรม</h6>
          <div class="table-responsive shadow-sm rounded">
            <table class="table table-sm table-bordered mb-0" style="font-size: 0.85rem;">
              <thead class="table-light">
                <tr>
                  <th>รายการ</th>
                  <th class="text-end" style="width: 120px;">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody>
                <tr class="fw-bold">
                  <td>รายรับ (งบประมาณที่ได้รับ)</td>
                  <td class="text-end text-success">฿${income.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                ${expensesRows || '<tr><td colspan="2" class="text-center text-muted small">ไม่มีข้อมูลรายจ่าย</td></tr>'}
                <tr class="table-light fw-bold">
                  <td class="text-end">รวมรายจ่าย</td>
                  <td class="text-end text-danger">฿${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
                <tr class="fw-bold border-top border-2">
                  <td class="text-end">งบประมาณคงเหลือ</td>
                  <td class="text-end ${balance >= 0 ? 'text-primary' : 'text-danger'}">฿${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `.replace(/\n/g, ''); // Remove newlines to prevent extra <br> tags from formatTextWithLineBreaks
    } catch(err) {
      console.error('Budget Parse Error:', err);
    }

    // Map event data to news format for showNewsModal
    const mockNews = {
      title: event['ชื่อกิจกรรม'],
      category: 'กิจกรรมชุมชน',
      date: `${toThaiDate(event['วันที่จัดกิจกรรม'])} | ${event['เวลาเริ่ม'] || '-'} น. - ${event['เวลาสิ้นสุด'] || '-'} น.`,
      author: `${event.village || 'ชุมชน'}`,
      content1: event['รายละเอียดกิจกรรม'] || '',
      content2: '<h5 class="mt-4 mb-2 fw-bold text-success">ผลที่เกิดขึ้นจากการทำกิจกรรม:</h5>',
      content3: (event['ผลที่เกิดขึ้นจากการทำกิจกรรม'] || '') + budgetHtml
    };

    const images = [];
    for (let i = 1; i <= 4; i++) {
      const img = event[`ภาพกิจกรรม${i}`];
      if (img) {
        images.push({ url: img, name: `ภาพที่ ${i}` });
      }
    }

    showNewsModal(mockNews, images);
  }

  function viewNewsDetail(id) {
    const news = appData.news.find(n => (n.ID || n.id) === id);
    if (!news) return;

    // Extract additional images (Img1 - Img10)
    const galleryImages = [];
    for (let i = 1; i <= 10; i++) {
      const imgUrl = (news[`img${i}`] || '').trim();
      if (imgUrl && isImageUrl(imgUrl)) {
        galleryImages.push({
          url: imgUrl,
          name: `Image ${i}`
        });
      }
    }

    showNewsModal(news, galleryImages);
  }

  /**
   * Show the News Detail Modal with Luxurious Styling
   */
  function handleTextareaInput(el) {
    if (!el) return;
    // Auto-expand height
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function formatTimeForInput(timeStr) {
    if (!timeStr) return '';
    const cleanTime = timeStr.toString().trim();
    // Try to extract HH:MM from string
    const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const hours = timeMatch[1].padStart(2, '0');
      const minutes = timeMatch[2].padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    // If no match, return empty string
    return '';
  }

  function formatTextWithLineBreaks(text) {
    if (!text) return '';
    // Detect if it's already HTML (contains <...>)
    if (/<[a-z][\s\S]*>/i.test(text)) {
      return text.replace(/\n/g, '<br>');
    }
    // Otherwise escape and add <br>
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }

  function showNewsModal(news, images) {
    // Process 7 columns of content
    let contentHtml = '';
    for (let i = 1; i <= 7; i++) {
      const content = (news[`content${i}`] || '').trim();
      if (!content) continue;

      if (isImageUrl(content) || content.startsWith('http')) {
        if (isImageUrl(content)) {
          contentHtml += `
            <div class="news-image-wrap">
              <img src="${content}" class="img-fluid w-100" style="max-height: 400px; object-fit: contain;" onerror="this.outerHTML='<p class=text-muted>ไม่สามารถโหลดรูปภาพได้</p>'">
            </div>`;
        } else {
          contentHtml += `<p class="my-4 text-center"><a href="${content}" target="_blank" class="btn btn-outline-primary-th px-4"><i class="bi bi-link-45deg me-2"></i>อ่านเพิ่มเติมจากลิงก์</a></p>`;
        }
      } else {
        contentHtml += `<div class="news-content-text">${formatTextWithLineBreaks(content)}</div>`;
      }
    }

    // Process Gallery Images (Grid)
    let gridHtml = '';
    if (images && images.length > 0) {
      gridHtml = `
        <div class="news-gallery-title">
          <span><i class="bi bi-images me-2"></i>อัลบั้มรูปภาพเพิ่มเติม</span>
        </div>
        <div class="row g-3 justify-content-center">
          ${images.map(img => `
            <div class="col-6 col-md-3">
              <a href="${img.url}" target="_blank" title="${img.name}">
                <div class="news-grid-item" style="height: 140px;">
                  <img src="${img.url}" class="img-fluid h-100 w-100" style="object-fit: cover;" alt="${img.name}" onerror="this.src='https://placehold.co/100x100?text=Error'">
                </div>
              </a>
            </div>
          `).join('')}
        </div>
      `;
    }

    Swal.fire({
      html: `
        <div class="news-modal-header">
          <h2>${news.title}</h2>
          <div class="news-modal-meta">
            <span><i class="bi bi-tag-fill me-2" style="color: var(--secondary)"></i>${news.category || 'ข่าวสาร'}</span>
            <span><i class="bi bi-calendar3 me-2" style="color: var(--secondary)"></i>${news.date || ''}</span>
            <span><i class="bi bi-person-fill me-2" style="color: var(--secondary)"></i>${news.author || 'แอดมิน'}</span>
          </div>
        </div>
        <div class="news-modal-body">
          <div class="news-content-area">
            ${contentHtml}
          </div>
          ${gridHtml}
          <div class="text-center mt-5 pt-4">
            <button class="btn btn-secondary-th px-4 py-2 shadow-lg" onclick="Swal.close()">
              <i class="bi bi-check-circle me-2"></i>ปิด
            </button>
          </div>
        </div>
      `,
      width: '1000px',
      showConfirmButton: false,
      showCloseButton: true,
      padding: '0',
      customClass: {
        popup: 'news-detail-popup',
        htmlContainer: 'p-0 m-0'
      }
    });
  }

  /**
   * Generate PDF for an Event
   */
  async function generateEventPDF(id) {
    const e = appData.events.find(item => (item.ID || item.id) === id) || (appData.approvedEvents && appData.approvedEvents.find(item => (item.ID || item.id) === id));
    if (!e) return;

    Swal.fire({
      title: 'กำลังสร้าง PDF...',
      html: 'กรุณารอสักครู่ ระบบกำลังจัดเตรียมเอกสาร',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // รอให้ฟอนต์โหลดเสร็จสมบูรณ์ และหน่วงเวลาเล็กน้อยเพื่อให้ Canvas พร้อม
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));

      // 1. Prepare Budget Data
      let budget = { income: 0, expenses: [0, 0, 0, 0, 0, 0] };
      try {
        budget = JSON.parse(e['งบประมาณ'] || '{}');
      } catch (err) { }

      const income = parseFloat(budget.income) || 0;
      const expenses = budget.expenses || [];
      const expenseLabels = [
        '1. ค่าตอบแทน (วิทยากร/อาสาสมัคร/ประสานงาน)',
        '2. ค่าจ้าง (จัดทำข้อมูล/ทำของ)',
        '3. ค่าใช้สอย (พาหนะ/ที่พัก/ประชุม/อาหาร/สถานที่)',
        '4. ค่าวัสดุ (เครื่องเขียน/สำนักงาน/โฆษณา)',
        '5. ค่าสาธารณูปโภค (ไฟฟ้า/น้ำ/โทรศัพท์/ไปรษณีย์)',
        '6. ค่าอื่นๆ'
      ];

      let totalExpenses = 0;
      let expensesRows = '';
      expenseLabels.forEach((label, i) => {
        const amount = parseFloat(expenses[i]) || 0;
        totalExpenses += amount;
        if (amount > 0) {
          expensesRows += `
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; font-size: 14px;">${label}</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; text-align: right; font-size: 14px;">฿${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          `;
        }
      });
      const balance = income - totalExpenses;

      // 2. Prepare Images
      let imagesHtml = '';
      for (let i = 1; i <= 4; i++) {
        const img = e[`ภาพกิจกรรม${i}`];
        if (img) {
          imagesHtml += `
            <div style="width: 48%; margin-bottom: 20px; display: inline-block; vertical-align: top; text-align: center; margin-right: 1%;">
              <img src="${img}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 10px; border: 1px solid #eee; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
              <div style="font-size: 12px; color: #777; margin-top: 8px;">ภาพประกอบที่ ${i}</div>
            </div>
          `;
        }
      }

      // 3. Create PDF Content with Beautiful Styling
      const element = document.createElement('div');
      element.style.width = '680px';
      element.style.padding = '30px';
      element.style.backgroundColor = '#fff';
      element.style.fontFamily = "'Sarabun', sans-serif";
      element.style.color = '#333';
      element.style.textRendering = "geometricPrecision"; // เพิ่มความแม่นยำในการวาดตัวอักษร

      element.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600&display=swap');
          * { 
            font-family: 'Sarabun', sans-serif !important; 
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
            letter-spacing: 0px !important;
          }
          .pdf-header {
            font-weight: 600 !important; /* ใช้ 600 แทน bold (700) เพื่อลดปัญหาการเรนเดอร์สระ/วรรณยุกต์เพี้ยน */
            line-height: 1.4 !important;
          }
        </style>
        <div style="text-align: center; border-bottom: 4px solid #039780; padding-bottom: 20px; margin-bottom: 30px;">
          <div class="pdf-header" style="color: #039780; margin-bottom: 5px; font-size: 28px;">รายงานสรุปผลการจัดกิจกรรม</div>
          <div style="color: #666; font-size: 16px;">หน่วยจัดการจังหวัดเชียงราย (Node มุ่งเป้า สสส.)</div>
        </div>

        <div style="margin-bottom: 25px;">
          <div class="pdf-header" style="color: #039780; border-left: 5px solid #F7A072; padding-left: 10px; margin-bottom: 15px; font-size: 20px;">1. ข้อมูลทั่วไป</div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="width: 25%; font-weight: 600; color: #555; padding: 8px 0;">ชื่อกิจกรรม:</td>
              <td style="width: 75%; padding: 8px 0; border-bottom: 1px dashed #eee;">${e['ชื่อกิจกรรม'] || '-'}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #555; padding: 8px 0;">วันและเวลา:</td>
              <td style="padding: 8px 0; border-bottom: 1px dashed #eee;">${toThaiDate(e['วันที่จัดกิจกรรม'])} | ${e['เวลาเริ่ม'] || '-'} - ${e['เวลาสิ้นสุด'] || '-'} น.</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #555; padding: 8px 0;">สถานที่:</td>
              <td style="padding: 8px 0; border-bottom: 1px dashed #eee;">${e['สถานที่'] || '-'}</td>
            </tr>
            <tr>
              <td style="font-weight: 600; color: #555; padding: 8px 0;">ชุมชน/หมู่บ้าน:</td>
              <td style="padding: 8px 0; border-bottom: 1px dashed #eee;">${e.village || '-'}</td>
            </tr>
          </table>
        </div>

        <div style="margin-bottom: 25px;">
          <div class="pdf-header" style="color: #039780; border-left: 5px solid #F7A072; padding-left: 10px; margin-bottom: 10px; font-size: 20px;">2. รายละเอียดกิจกรรม</div>
          <div style="background-color: #fcfcfc; padding: 15px; border-radius: 8px; line-height: 1.6; border: 1px solid #f0f0f0; white-space: pre-wrap;">${e['รายละเอียดกิจกรรม'] || '-'}</div>
        </div>

        <div style="margin-bottom: 25px;">
          <div class="pdf-header" style="color: #039780; border-left: 5px solid #F7A072; padding-left: 10px; margin-bottom: 10px; font-size: 20px;">3. ผลที่เกิดขึ้น</div>
          <div style="background-color: #fcfcfc; padding: 15px; border-radius: 8px; line-height: 1.6; border: 1px solid #f0f0f0; white-space: pre-wrap;">${e['ผลที่เกิดขึ้นจากการทำกิจกรรม'] || '-'}</div>
        </div>

        <!-- บังคับขึ้นหน้าใหม่ถ้าข้อมูลก่อนหน้ายาวเกินไป หรือป้องกันการตัดกลางตาราง -->
        <div style="page-break-before: auto; margin-bottom: 25px;">
          <div class="pdf-header" style="color: #039780; border-left: 5px solid #F7A072; padding-left: 10px; margin-bottom: 15px; font-size: 20px;">4. สรุปงบประมาณ</div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #dee2e6;">
            <thead>
              <tr style="background-color: #039780; color: #fff;">
                <th style="padding: 10px; text-align: left; border: 1px solid #039780;">รายการ</th>
                <th style="padding: 10px; text-align: right; width: 150px; border: 1px solid #039780;">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 10px; border: 1px solid #dee2e6; font-weight: 600;">รายรับ (งบประมาณที่ได้รับ)</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right; color: #198754; font-weight: 600;">฿${income.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              ${expensesRows || '<tr><td colspan="2" style="padding: 10px; text-align: center; color: #999;">ไม่มีข้อมูลรายจ่าย</td></tr>'}
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right; font-weight: 600;">รวมรายจ่ายทั้งหมด</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right; color: #dc3545; font-weight: 600;">฿${totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr style="background-color: #e9ecef; font-weight: 600;">
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right;">คงเหลือ</td>
                <td style="padding: 10px; border: 1px solid #dee2e6; text-align: right; color: #0d6efd;">฿${balance.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style="page-break-before: always; padding-top: 20px;">
          <div class="pdf-header" style="color: #039780; border-left: 5px solid #F7A072; padding-left: 10px; margin-bottom: 20px; font-size: 20px;">5. ภาพบรรยากาศกิจกรรม</div>
          <div style="width: 100%; text-align: center;">
            ${imagesHtml || '<p style="color: #999;">ไม่มีภาพประกอบกิจกรรม</p>'}
          </div>
        </div>

        <div style="margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; text-align: right; font-size: 12px; color: #999;">
          <p>เอกสารนี้สร้างโดยระบบอัตโนมัติ เมื่อวันที่ ${new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.</p>
        </div>
      `;

      // 4. PDF Generation Options
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `รายงาน_${e['ชื่อกิจกรรม'] || 'กิจกรรม'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true, // กลับมาเปิดตัวนี้เพื่อช่วยเรื่องการจัดตำแหน่งตัวอักษรไทยบางกรณี
          logging: false,
          width: 700
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // 5. Generate and Download
      await html2pdf().set(opt).from(element).save();
      
      Swal.close();
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
      Toast.fire({
        icon: 'success',
        title: 'สร้าง PDF สำเร็จ'
      });

    } catch (error) {
      console.error('PDF Generation Error:', error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถสร้าง PDF ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  }
