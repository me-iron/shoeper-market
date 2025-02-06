// 로컬 스토리지에서 상품 데이터 가져오기
function getProducts() {
    return JSON.parse(localStorage.getItem('products')) || [];
}

// 상품 데이터 저장하기
function saveProduct(product) {
    const products = getProducts();
    products.push({
        id: Date.now(),
        ...product,
        date: new Date().toISOString()
    });
    localStorage.setItem('products', JSON.stringify(products));
}

// 메인 페이지 상품 목록 표시
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    const productGrid = document.querySelector('.product-grid');
    const products = getProducts();
    
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.images[0]}" alt="${product.title}">
            <h3>${product.title}</h3>
            <p>${product.price}원</p>
            <p>판매자: ${product.seller}</p>
            <button onclick="location.href='detail.html?id=${product.id}'">자세히 보기</button>
        `;
        productGrid.appendChild(card);
    });
}

// 판매글 작성 폼 처리
if (window.location.pathname.endsWith('post.html')) {
    const form = document.getElementById('post-form');
    const matchUrlInput = form.querySelector('input[name="matchUrl"]');
    const matchInfoDiv = document.getElementById('match-info');
    
    // URL이 수정 모드인지 확인
    const isEditMode = new URLSearchParams(window.location.search).get('edit') === 'true';
    
    // 수정 모드일 경우 기존 데이터 불러오기
    if (isEditMode) {
        const editProduct = JSON.parse(localStorage.getItem('editProduct'));
        if (editProduct) {
            // 폼에 기존 데이터 채우기
            form.querySelector('input[name="title"]').value = editProduct.title;
            form.querySelector('input[name="price"]').value = editProduct.price;
            form.querySelector('input[name="seller"]').value = editProduct.seller;
            form.querySelector('input[name="matchUrl"]').value = editProduct.matchUrl;
            form.querySelector('textarea[name="content"]').value = editProduct.content;
            form.querySelector('input[name="password"]').value = editProduct.password;
            
            // 이미지 입력 필드를 숨기고 required 속성 제거
            form.querySelector('input[name="images"]').style.display = 'none';
            form.querySelector('input[name="images"]').required = false;
            
            // 제목 변경
            document.querySelector('h1').textContent = '판매글 수정';
            // 버튼 텍스트 변경
            form.querySelector('button[type="submit"]').textContent = '수정하기';
        }
    }
    
    // URL 입력 시 매치 정보 가져오기
    matchUrlInput.addEventListener('change', async () => {
        const url = matchUrlInput.value;
        if (url.includes('plabfootball.com/match/')) {
            // 실제로는 API나 크롤링으로 데이터를 가져와야 하지만,
            // 예시로 하드코딩된 데이터를 사용
            matchInfoDiv.innerHTML = `
                <div class="match-details">
                    <p><strong>장소:</strong> 플랩 스타디움 가산 코오롱테크노밸리 1구장(블랙)</p>
                    <p><strong>시간:</strong> 2월 8일 토요일 09:00</p>
                </div>
            `;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const isEditMode = new URLSearchParams(window.location.search).get('edit') === 'true';
        
        // 필수 입력값 검증
        const requiredFields = {
            title: '제목',
            price: '가격',
            seller: '판매자 이름',
            content: '상세 설명',
            matchUrl: '플랩풋볼 소셜 매치 URL'
        };
        
        const missingFields = [];
        
        for (const [field, label] of Object.entries(requiredFields)) {
            const value = formData.get(field);
            if (!value || value.trim() === '') {
                missingFields.push(label);
            }
        }
        
        // 새 게시물일 때만 이미지 검증
        const imageFiles = formData.getAll('images');
        if (!isEditMode && (imageFiles.length === 0 || !imageFiles[0].size)) {
            missingFields.push('상품 이미지');
        }
        
        if (missingFields.length > 0) {
            alert(`다음 항목을 입력해주세요:\n\n${missingFields.join('\n')}`);
            return;
        }

        const product = {
            title: formData.get('title'),
            price: parseInt(formData.get('price')),
            seller: formData.get('seller'),
            content: formData.get('content'),
            matchUrl: formData.get('matchUrl'),
            password: formData.get('password'),
        };
        
        if (isEditMode) {
            // 수정 모드일 때는 기존 데이터 업데이트
            const editProduct = JSON.parse(localStorage.getItem('editProduct'));
            const products = getProducts();
            const updatedProducts = products.map(p => {
                if (p.id === editProduct.id) {
                    return {
                        ...p,
                        ...product,
                        images: p.images  // 기존 이미지 유지
                    };
                }
                return p;
            });
            localStorage.setItem('products', JSON.stringify(updatedProducts));
            localStorage.removeItem('editProduct');  // 임시 저장 데이터 삭제
        } else {
            // 새 게시물 작성
            const images = await Promise.all(
                [...imageFiles].map(file => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(file);
                    });
                })
            );
            saveProduct({ ...product, images });
        }
        window.location.href = 'index.html';
    });
}

// 상세 페이지 표시
if (window.location.pathname.endsWith('detail.html')) {
    const productId = new URLSearchParams(window.location.search).get('id');
    const products = getProducts();
    const product = products.find(p => p.id === parseInt(productId));
    
    if (product) {
        const detailContainer = document.querySelector('.product-detail');
        detailContainer.innerHTML = `
            <div class="product-images">
                ${product.images.map(img => `<img src="${img}" alt="${product.title}">`).join('')}
            </div>
            <div class="product-info">
                <h2>${product.title}</h2>
                <p class="price">${product.price}원</p>
                <p class="seller">판매자: ${product.seller}</p>
                <div class="match-details">
                    <p><strong>장소:</strong> 플랩 스타디움 가산 코오롱테크노밸리 1구장(블랙)</p>
                    <p><strong>시간:</strong> 2월 8일 토요일 09:00</p>
                </div>
                <p class="description">${product.content}</p>
                <div class="button-group">
                    ${product.matchUrl ? 
                        `<button class="match-btn" onclick="window.open('${product.matchUrl}', '_blank')">실착 거래</button>` 
                        : ''}
                    <div class="admin-buttons">
                        <button onclick="checkPasswordAndModify(${product.id})">수정</button>
                        <button onclick="checkPasswordAndDelete(${product.id})" class="delete-btn">삭제</button>
                    </div>
                </div>
            </div>
        `;
    }
}

// 비밀번호 확인 및 수정/삭제 함수들
function checkPasswordAndModify(productId) {
    const password = prompt('Shoeper:\n게시글 수정을 위한 비밀번호를 입력하세요.');
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    
    if (product && product.password === password) {
        // 수정할 상품 정보를 로컬 스토리지에 임시 저장
        localStorage.setItem('editProduct', JSON.stringify(product));
        window.location.href = 'post.html?edit=true';
    } else if (password !== null) {  // 취소 버튼을 누르지 않은 경우에만 알림
        alert('비밀번호가 일치하지 않습니다.');
    }
}

function checkPasswordAndDelete(productId) {
    const password = prompt('Shoeper:\n게시글 삭제를 위한 비밀번호를 입력하세요.');
    const products = getProducts();
    const product = products.find(p => p.id === productId);
    
    if (product && product.password === password) {
        if (confirm('정말 삭제하시겠습니까?')) {
            const updatedProducts = products.filter(p => p.id !== productId);
            localStorage.setItem('products', JSON.stringify(updatedProducts));
            window.location.href = 'index.html';
        }
    } else if (password !== null) {  // 취소 버튼을 누르지 않은 경우에만 알림
        alert('비밀번호가 일치하지 않습니다.');
    }
} 