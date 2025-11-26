/**
 * 보안 강화 상품 라우트
 * - SQL Injection 방지 (Prepared Statements)
 * - XSS 방지 (입력값 검증 및 이스케이프)
 * - 권한 확인 (본인 상품만 수정/삭제)
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../db');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateInput, sanitizeInput } = require('../middleware/security');
const { productSchema, searchSchema } = require('../middleware/validation');

/**
 * 상품 목록 조회
 * GET /api/products
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      category = '',
      minPrice = 0,
      maxPrice = 999999999,
      location = '',
      page = 1,
      limit = 20,
      sort = 'latest'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 정렬 옵션 검증 (SQL Injection 방지)
    const allowedSorts = {
      latest: 'p.created_at DESC',
      price_low: 'p.price ASC',
      price_high: 'p.price DESC',
      popular: 'p.view_count DESC',
      rating: 'p.rating DESC'
    };

    const orderBy = allowedSorts[sort] || allowedSorts.latest;

    // 쿼리 빌드 (Prepared Statement 사용)
    let sql = `
      SELECT 
        p.*,
        u.username as seller_name,
        u.rating as seller_rating,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_thumbnail = TRUE LIMIT 1) as thumbnail
      FROM products p
      INNER JOIN users u ON p.seller_id = u.id
      WHERE p.status = 'active'
    `;

    const params = [];

    // 동적 필터링 (파라미터 바인딩)
    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    if (minPrice) {
      sql += ' AND p.price >= ?';
      params.push(parseInt(minPrice));
    }

    if (maxPrice) {
      sql += ' AND p.price <= ?';
      params.push(parseInt(maxPrice));
    }

    if (location) {
      sql += ' AND p.location LIKE ?';
      params.push(`%${location}%`);
    }

    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const products = await query(sql, params);

    // 전체 개수 조회
    let countSql = 'SELECT COUNT(*) as total FROM products p WHERE p.status = "active"';
    const countParams = [];

    if (category) {
      countSql += ' AND p.category = ?';
      countParams.push(category);
    }
    if (minPrice) {
      countSql += ' AND p.price >= ?';
      countParams.push(parseInt(minPrice));
    }
    if (maxPrice) {
      countSql += ' AND p.price <= ?';
      countParams.push(parseInt(maxPrice));
    }
    if (location) {
      countSql += ' AND p.location LIKE ?';
      countParams.push(`%${location}%`);
    }

    const [{ total }] = await query(countSql, countParams);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('상품 목록 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * 상품 검색
 * GET /api/products/search
 */
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, category, minPrice, maxPrice, location, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '검색어를 입력해주세요.'
      });
    }

    // SQL Injection 방지를 위한 파라미터 바인딩
    const searchQuery = `%${q.trim()}%`;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let sql = `
      SELECT 
        p.*,
        u.username as seller_name,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_thumbnail = TRUE LIMIT 1) as thumbnail,
        MATCH(p.title, p.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
      FROM products p
      INNER JOIN users u ON p.seller_id = u.id
      WHERE p.status = 'active'
        AND (p.title LIKE ? OR p.description LIKE ?)
    `;

    const params = [q, searchQuery, searchQuery];

    if (category) {
      sql += ' AND p.category = ?';
      params.push(category);
    }

    if (minPrice) {
      sql += ' AND p.price >= ?';
      params.push(parseInt(minPrice));
    }

    if (maxPrice) {
      sql += ' AND p.price <= ?';
      params.push(parseInt(maxPrice));
    }

    if (location) {
      sql += ' AND p.location LIKE ?';
      params.push(`%${location}%`);
    }

    sql += ' ORDER BY relevance DESC, p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const products = await query(sql, params);

    // 검색 기록 저장
    if (req.user) {
      await query(
        'INSERT INTO search_history (user_id, search_query, result_count) VALUES (?, ?, ?)',
        [req.user.id, q, products.length]
      );
    }

    res.json({
      success: true,
      data: {
        products,
        query: q,
        count: products.length
      }
    });

  } catch (error) {
    console.error('상품 검색 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * 상품 상세 조회
 * GET /api/products/:id
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 상품 ID입니다.'
      });
    }

    // 상품 정보 조회
    const products = await query(
      `SELECT 
        p.*,
        u.id as seller_id,
        u.username as seller_name,
        u.profile_image as seller_image,
        u.rating as seller_rating,
        u.total_sales as seller_total_sales
       FROM products p
       INNER JOIN users u ON p.seller_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.'
      });
    }

    const product = products[0];

    // 상품 이미지 조회
    const images = await query(
      'SELECT image_url, display_order FROM product_images WHERE product_id = ? ORDER BY display_order ASC',
      [id]
    );

    // 조회수 증가
    await query(
      'UPDATE products SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );

    // 최근 본 상품 기록 (로그인한 경우)
    if (req.user) {
      await query(
        'INSERT INTO recently_viewed (user_id, product_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE viewed_at = NOW()',
        [req.user.id, id]
      );
    }

    res.json({
      success: true,
      data: {
        ...product,
        images
      }
    });

  } catch (error) {
    console.error('상품 상세 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

/**
 * 상품 등록
 * POST /api/products
 */
router.post('/',
  authenticateToken,
  validateInput(productSchema),
  async (req, res) => {
    try {
      const {
        title,
        description,
        price,
        category,
        stock = 1,
        location,
        is_negotiable = false,
        condition_status
      } = req.body;

      const productId = uuidv4();

      // 트랜잭션으로 상품 등록
      await transaction(async (conn) => {
        // 상품 생성
        await conn.execute(
          `INSERT INTO products 
           (id, title, description, price, category, seller_id, stock, location, is_negotiable, condition_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [productId, title, description, price, category, req.user.id, stock, location, is_negotiable, condition_status]
        );

        // TODO: 이미지 업로드 처리 (multer 사용)
        // if (req.files && req.files.length > 0) {
        //   for (let i = 0; i < req.files.length; i++) {
        //     await conn.execute(
        //       'INSERT INTO product_images (product_id, image_url, display_order, is_thumbnail) VALUES (?, ?, ?, ?)',
        //       [productId, req.files[i].path, i, i === 0]
        //     );
        //   }
        // }
      });

      res.status(201).json({
        success: true,
        message: '상품이 등록되었습니다.',
        data: { id: productId }
      });

    } catch (error) {
      console.error('상품 등록 에러:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 상품 수정
 * PUT /api/products/:id
 */
router.put('/:id',
  authenticateToken,
  validateInput(productSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, price, category, stock, location, is_negotiable, condition_status } = req.body;

      // 상품 소유자 확인
      const products = await query(
        'SELECT seller_id FROM products WHERE id = ?',
        [id]
      );

      if (products.length === 0) {
        return res.status(404).json({
          success: false,
          message: '상품을 찾을 수 없습니다.'
        });
      }

      // 권한 확인 (본인 또는 관리자만)
      if (products[0].seller_id !== req.user.id && !req.user.is_admin) {
        return res.status(403).json({
          success: false,
          message: '권한이 없습니다.'
        });
      }

      // 상품 수정
      await query(
        `UPDATE products 
         SET title = ?, description = ?, price = ?, category = ?, 
             stock = ?, location = ?, is_negotiable = ?, condition_status = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [title, description, price, category, stock, location, is_negotiable, condition_status, id]
      );

      res.json({
        success: true,
        message: '상품이 수정되었습니다.'
      });

    } catch (error) {
      console.error('상품 수정 에러:', error);
      res.status(500).json({
        success: false,
        message: '서버 오류가 발생했습니다.'
      });
    }
  }
);

/**
 * 상품 삭제
 * DELETE /api/products/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 상품 소유자 확인
    const products = await query(
      'SELECT seller_id FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: '상품을 찾을 수 없습니다.'
      });
    }

    // 권한 확인
    if (products[0].seller_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        message: '권한이 없습니다.'
      });
    }

    // Soft Delete (상태만 변경)
    await query(
      'UPDATE products SET status = "deleted" WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '상품이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('상품 삭제 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
});

module.exports = router;
