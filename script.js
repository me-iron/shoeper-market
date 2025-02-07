// Supabase 클라이언트 초기화
const supabaseUrl = 'https://mjzlbvcokyvffmjcfzzr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qemxidmNva3l2ZmZtamNmenpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg4Mjk0OTQsImV4cCI6MjA1NDQwNTQ5NH0.-Wg4BuGmKEzYtg9PSfvuaDk5Q8vvKBfiSgv0hpChHws'
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey)

// 기본 이미지 URL 상수 추가
const DEFAULT_IMAGE_URL = 'https://placehold.co/400x300/e2e8f0/1e293b?text=No+Image';

// 로컬 스토리지에서 상품 데이터 가져오기
async function getProducts(page) {
    const { data, error } = await supabaseClient
        .from('products')
        .select(`
            id,
            title,
            price,
            seller,
            match_time,
            created_at,
            images
        `)
        .order('created_at', { ascending: false })
        .limit(20)
        .range(page * 20, (page + 1) * 20 - 1)
    
    if (error) {
        console.error('Error fetching products:', error)
        return []
    }
    return data
}

// 상품 데이터 저장하기
async function saveProduct(product) {
    const { data, error } = await supabaseClient
        .from('products')
        .insert([{
            ...product,
            created_at: new Date().toISOString()
        }])
        .select()
    
    if (error) {
        console.error('Error saving product:', error)
        throw error
    }
    return data[0]
}

// 날짜 포맷팅 함수
function formatDateTime(dateTimeStr) {
    const dt = new Date(dateTimeStr);
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return dt.toLocaleString('ko-KR', options);
}

// 상대적 시간 표시 함수 (예: "3일 전", "방금 전")
function getRelativeTimeString(dateTimeStr) {
    const dt = new Date(dateTimeStr);
    const now = new Date();
    const diffTime = Math.abs(now - dt);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));

    if (diffDays > 0) return `${diffDays}일 전`;
    if (diffHours > 0) return `${diffHours}시간 전`;
    if (diffMinutes > 0) return `${diffMinutes}분 전`;
    return '방금 전';
}

// 메인 페이지 상품 목록 표시
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
    const productGrid = document.querySelector('.product-grid');
    let page = 0;
    let loading = false;
    let hasMore = true;
    
    async function loadProducts() {
        if (loading || !hasMore) return;
        loading = true;
        
        const products = await getProducts(page);
        if (products.length < 20) hasMore = false;
        
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${product.images?.[0] || DEFAULT_IMAGE_URL}" alt="${product.title}">
                <h3>${product.title}</h3>
                <p>${product.price.toLocaleString()}원</p>
                <p>판매자: ${product.seller}</p>
                <p class="match-time">${formatDateTime(product.match_time)}</p>
                <p class="created-time">${getRelativeTimeString(product.created_at)}</p>
                <button onclick="location.href='detail.html?id=${product.id}'">자세히 보기</button>
            `;
            productGrid.appendChild(card);
        });
        
        page++;
        loading = false;
    }
    
    // 무한 스크롤 구현
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
            loadProducts();
        }
    });
    
    loadProducts().catch(console.error);
}

// 판매글 작성 폼 처리
if (window.location.pathname.endsWith('post.html')) {
    const form = document.getElementById('post-form');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    
    // URL이 수정 모드인지 확인
    const isEditMode = new URLSearchParams(window.location.search).get('edit') === 'true';
    
    // 수정 모드일 경우 기존 데이터 불러오기
    if (isEditMode) {
        const editProduct = JSON.parse(sessionStorage.getItem('editProduct'));
        if (editProduct) {
            // 폼에 기존 데이터 채우기
            form.querySelector('input[name="title"]').value = editProduct.title;
            form.querySelector('input[name="price"]').value = editProduct.price;
            form.querySelector('input[name="seller"]').value = editProduct.seller;
            form.querySelector('input[name="match_location"]').value = editProduct.match_location;
            form.querySelector('input[name="match_time"]').value = editProduct.match_time;
            form.querySelector('textarea[name="content"]').value = editProduct.content;
            form.querySelector('input[name="password"]').value = editProduct.password;
            
            // 이미지 입력 필드의 required 속성만 제거
            form.querySelector('input[name="images"]').required = false;
            
            // 현재 이미지 미리보기 추가
            const previewDiv = document.createElement('div');
            previewDiv.className = 'image-preview';
            previewDiv.innerHTML = `
                <p>현재 이미지:</p>
                <div class="preview-images">
                    ${(editProduct.images || []).map(img => `<img src="${img}" alt="현재 이미지">`).join('')}
                </div>
                <p>새 이미지를 선택하지 않으면 현재 이미지가 유지됩니다.</p>
            `;
            form.querySelector('input[name="images"]').parentNode.insertBefore(previewDiv, form.querySelector('input[name="images"]'));
            
            // 제목 변경
            document.querySelector('h1').textContent = '판매글 수정';
            // 버튼 텍스트 변경
            form.querySelector('button[type="submit"]').textContent = '수정하기';
        }
    }
    
    // 유효성 검사 함수들
    function validatePrice(price) {
        const minPrice = 1000;
        const maxPrice = 1000000;
        const numPrice = parseInt(price);
        
        if (isNaN(numPrice)) return '가격은 숫자만 입력 가능합니다.';
        if (numPrice < minPrice) return `최소 가격은 ${minPrice.toLocaleString()}원입니다.`;
        if (numPrice > maxPrice) return `최대 가격은 ${maxPrice.toLocaleString()}원입니다.`;
        return null;
    }
    
    function validateMatchTime(dateTimeStr) {
        const matchTime = new Date(dateTimeStr);
        const now = new Date();
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 3); // 3개월 이내
        
        if (matchTime < now) return '과거 시간은 선택할 수 없습니다.';
        if (matchTime > maxDate) return '3개월 이내의 매치만 등록 가능합니다.';
        return null;
    }
    
    function validateImages(files) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const maxCount = 5;
        
        if (files.length > maxCount) return `이미지는 최대 ${maxCount}개까지 업로드 가능합니다.`;
        
        for (const file of files) {
            if (file.size > maxSize) return '이미지 크기는 5MB 이하여야 합니다.';
            if (!file.type.startsWith('image/')) return '이미지 파일만 업로드 가능합니다.';
        }
        return null;
    }
    
    // 이미지 미리보기 함수
    function handleImagePreview(files) {
        imagePreview.innerHTML = '';
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button type="button" class="remove-image" onclick="this.parentElement.remove()">×</button>
                `;
                imagePreview.appendChild(div);
            }
            reader.readAsDataURL(file);
        });
    }
    
    // 이미지 선택 이벤트
    imageInput.addEventListener('change', (e) => {
        handleImagePreview(e.target.files);
    });
    
    // 드래그 앤 드롭 이벤트
    const dropZone = document.getElementById('dropZone');
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        imageInput.files = files;
        handleImagePreview(files);
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const isEditMode = new URLSearchParams(window.location.search).get('edit') === 'true';
        
        // 이미지 파일 검증
        const imageInput = form.querySelector('input[name="images"]');
        const imageFiles = imageInput ? imageInput.files : [];
        
        // 가격 유효성 검사
        const priceError = validatePrice(formData.get('price'));
        if (priceError) {
            alert(priceError);
            return;
        }
        
        // 매치 시간 유효성 검사
        const timeError = validateMatchTime(formData.get('match_time'));
        if (timeError) {
            alert(timeError);
            return;
        }
        
        // 필수 입력값 검증
        const requiredFields = {
            title: '제목',
            price: '가격',
            seller: '판매자 이름',
            content: '상세 설명',
            match_location: '매치 장소',
            match_time: '매치 시간'
        };
        
        const missingFields = [];
        
        for (const [field, label] of Object.entries(requiredFields)) {
            const value = formData.get(field);
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                missingFields.push(label);
            }
        }
        
        // 새 게시물일 때만 이미지 검증
        if (!isEditMode) {
            if (!imageInput || !imageFiles || imageFiles.length === 0) {
                missingFields.push('상품 이미지');
            } else {
                const imageError = validateImages(imageFiles);
                if (imageError) {
                    alert(imageError);
                    return;
                }
            }
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
            match_location: formData.get('match_location'),
            match_time: formData.get('match_time'),
            password: formData.get('password'),
            match_url: null  // 또는 빈 문자열 ''
        };
        
        if (isEditMode) {
            // 수정 모드일 때는 Supabase 데이터 업데이트
            const editProduct = JSON.parse(sessionStorage.getItem('editProduct'));
            
            // 새 이미지가 선택되었는지 확인
            let updatedImages = editProduct.images || [];
            if (imageFiles.length > 0) {
                try {
                    updatedImages = await uploadImages(imageFiles);
                } catch (error) {
                    console.error('Error uploading images:', error);
                    alert('이미지 업로드에 실패했습니다.');
                    return;
                }
            }
            
            const { error: updateError } = await supabaseClient
                .from('products')
                .update({
                    ...product,
                    images: updatedImages
                })
                .eq('id', editProduct.id);
            
            if (updateError) {
                console.error('Error updating product:', updateError);
                alert('게시물 수정에 실패했습니다.');
                return;
            }
            sessionStorage.removeItem('editProduct');  // 임시 저장 데이터 삭제
            window.location.href = 'index.html';  // 성공 시 목록으로 이동
        } else {
            // 새 게시물 작성
            try {
                const imageUrls = await uploadImages(imageFiles);
                console.log('Image URLs:', imageUrls);
                console.log('Product data:', { ...product, images: imageUrls });
                await saveProduct({ ...product, images: imageUrls });
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Error saving product:', error);
                alert('게시물 등록에 실패했습니다.');
            }
        }
    });
}

// 상세 페이지 표시
if (window.location.pathname.endsWith('detail.html')) {
    const productId = new URLSearchParams(window.location.search).get('id');
    let likeData; // 전역 변수로 선언
    
    async function loadProduct() {
        const { data: product, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('id', parseInt(productId))
            .single();
        
        if (error) {
            console.error('Error fetching product:', error);
            return;
        }
        
        // 좋아요 수 가져오기
        const { data: likes } = await supabaseClient
            .from('likes')
            .select('count')
            .eq('product_id', productId)
            .single();
        likeData = likes;
        
        // 댓글 가져오기
        const { data: comments } = await supabaseClient
            .from('comments')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });
        
        if (product) {
            const detailContainer = document.querySelector('.product-detail');
            detailContainer.innerHTML = `
                <div class="product-images">
                    ${(product.images || []).map(img => `<img src="${img || DEFAULT_IMAGE_URL}" alt="${product.title}">`).join('')}
                </div>
                <div class="product-info">
                    <h2>${product.title}</h2>
                    <p class="price">${product.price.toLocaleString()}원</p>
                    <p class="seller">판매자: ${product.seller}</p>
                    <div class="match-details">
                        <p><strong>장소:</strong> ${product.match_location}</p>
                        <p><strong>시간:</strong> ${formatDateTime(product.match_time)}</p>
                    </div>
                    <p class="description">${product.content}</p>
                    <p class="created-at">작성일: ${formatDateTime(product.created_at)}</p>
                    <div class="interaction-section">
                        <div class="like-button">
                            <button id="likeBtn" class="like-btn">
                                <span class="heart-icon">♡</span>
                                <span id="likeCount">0</span>
                            </button>
                        </div>
                    </div>
                    <div class="button-group">
                        <div class="admin-buttons">
                            <button onclick="checkPasswordAndModify(${product.id})">수정</button>
                            <button onclick="checkPasswordAndDelete(${product.id})" class="delete-btn">삭제</button>
                        </div>
                    </div>
                </div>
                <div class="comments-section">
                    <h3>댓글</h3>
                    <form id="comment-form">
                        <input type="text" name="nickname" placeholder="닉네임" required>
                        <textarea name="content" placeholder="댓글을 입력하세요" required></textarea>
                        <input type="password" name="password" placeholder="비밀번호" required>
                        <button type="submit">댓글 작성</button>
                    </form>
                    <div id="comments-list">
                        <!-- 댓글들이 여기에 동적으로 추가됨 -->
                    </div>
                </div>
            `;
            
            // 좋아요 버튼 상태 설정
            const likeCount = document.getElementById('likeCount');
            const heartIcon = document.querySelector('.heart-icon');
            const isLiked = localStorage.getItem(`liked_${productId}`);
            
            likeCount.textContent = likeData?.count || 0;
            heartIcon.textContent = isLiked ? '♥' : '♡';
            
            // 댓글 목록 표시
            const commentsList = document.getElementById('comments-list');
            commentsList.innerHTML = comments?.map(comment => `
                <div class="comment">
                    <div class="comment-header">
                        <span class="nickname">${comment.nickname}</span>
                        <span class="created-at">${getRelativeTimeString(comment.created_at)}</span>
                    </div>
                    <p class="comment-content">${comment.content}</p>
                </div>
            `).join('') || '';
            
            // DOM이 업데이트된 후에 이벤트 리스너 등록
            document.getElementById('likeBtn').addEventListener('click', handleLike);
            document.getElementById('comment-form').addEventListener('submit', handleCommentSubmit);
        }
    }
    
    // 좋아요 버튼 이벤트 핸들러
    async function handleLike() {
        const likeCount = document.getElementById('likeCount');
        const heartIcon = document.querySelector('.heart-icon');
        const storageKey = `liked_${productId}`;
        const isLiked = localStorage.getItem(storageKey);
        
        if (isLiked) {
            // 좋아요 취소
            const { error } = await supabaseClient
                .from('likes')
                .delete()
                .eq('product_id', parseInt(productId));
            
            if (!error) {
                localStorage.removeItem(storageKey);
                heartIcon.textContent = '♡';
                likeCount.textContent = parseInt(likeCount.textContent) - 1;
            }
        } else {
            // 좋아요 추가
            const currentCount = parseInt(likeCount.textContent) || 0;
            const { error } = await supabaseClient
                .from('likes')
                .upsert([{ 
                    product_id: parseInt(productId),
                    count: currentCount + 1
                }], {
                    onConflict: 'product_id'
                });
            
            if (!error) {
                localStorage.setItem(storageKey, 'true');
                heartIcon.textContent = '♥';
                likeCount.textContent = currentCount + 1;
            }
        }
    }
    
    // 댓글 폼 제출 핸들러
    async function handleCommentSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        const comment = {
            product_id: parseInt(productId),
            nickname: formData.get('nickname'),
            content: formData.get('content'),
            password: formData.get('password')
        };
        
        const { error } = await supabaseClient
            .from('comments')
            .insert([comment]);
            
        if (error) {
            alert('댓글 작성에 실패했습니다.');
            return;
        }
        
        // 댓글 목록만 새로고침
        form.reset();
        const { data: comments } = await supabaseClient
            .from('comments')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });
        
        const commentsList = document.getElementById('comments-list');
        commentsList.innerHTML = comments?.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <span class="nickname">${comment.nickname}</span>
                    <span class="created-at">${getRelativeTimeString(comment.created_at)}</span>
                </div>
                <p class="comment-content">${comment.content}</p>
            </div>
        `).join('') || '';
    }
    
    loadProduct().catch(console.error);
}

// 비밀번호 확인 및 수정/삭제 함수들
async function checkPasswordAndModify(productId) {
    const password = prompt('Shoeper:\n게시글 수정을 위한 비밀번호를 입력하세요.');
    const { data: product, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
    
    if (error) {
        console.error('Error fetching product:', error);
        return;
    }
    
    if (product && product.password === password) {
        sessionStorage.setItem('editProduct', JSON.stringify(product));  // localStorage 대신 sessionStorage 사용
        window.location.href = 'post.html?edit=true';
    } else if (password !== null) {
        alert('비밀번호가 일치하지 않습니다.');
    }
}

async function checkPasswordAndDelete(productId) {
    const password = prompt('Shoeper:\n게시글 삭제를 위한 비밀번호를 입력하세요.');
    const { data: product, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
    
    if (error) {
        console.error('Error fetching product:', error);
        return;
    }
    
    if (product && product.password === password) {
        if (confirm('정말 삭제하시겠습니까?')) {
            const { error: deleteError } = await supabaseClient
                .from('products')
                .delete()
                .eq('id', productId);
            
            if (deleteError) {
                console.error('Error deleting product:', deleteError);
                return;
            }
            window.location.href = 'index.html';
        }
    } else if (password !== null) {
        alert('비밀번호가 일치하지 않습니다.');
    }
}

async function uploadImages(files) {
    const uploadPromises = Array.from(files).map(async (file) => {
        // 이미지 리사이징
        const resizedImage = await resizeImage(file, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.8
        });
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `product-images/${fileName}`;
        
        const { error: uploadError } = await supabaseClient
            .storage
            .from('products')
            .upload(filePath, resizedImage);
            
        if (uploadError) {
            throw uploadError;
        }
        
        const { data: { publicUrl } } = supabaseClient
            .storage
            .from('products')
            .getPublicUrl(filePath);
            
        return publicUrl;
    });
    
    return Promise.all(uploadPromises);
}

async function resizeImage(file, options = {}) {
    const { maxWidth = 1200, maxHeight = 1200, quality = 0.8 } = options;
    
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
} 