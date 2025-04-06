import React, { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const BurgmullerTierList = () => {
  // ティアのリスト (S～D)の5段階
  const tiers = [
    { id: 's', label: 'S', color: '#ef4444' }, // bg-red-500
    { id: 'a', label: 'A', color: '#fdba74' }, // bg-orange-300
    { id: 'b', label: 'B', color: '#fde047' }, // bg-yellow-300
    { id: 'c', label: 'C', color: '#86efac' }, // bg-green-300
    { id: 'd', label: 'D', color: '#93c5fd' }  // bg-blue-300
  ];

  // ブルグミュラーの25の練習曲リスト
  const burgmullerPieces = [
    { id: 1, title: '1. すなおな心' },
    { id: 2, title: '2. アラベスク' },
    { id: 3, title: '3. 牧歌' },
    { id: 4, title: '4. 小さな集会' },
    { id: 5, title: '5. 無邪気' },
    { id: 6, title: '6. 進歩' },
    { id: 7, title: '7. 清らかな流れ' },
    { id: 8, title: '8. 優美' },
    { id: 9, title: '9. 狩り' },
    { id: 10, title: '10. やさしい花' },
    { id: 11, title: '11. せきれい' },
    { id: 12, title: '12. 別れ' },
    { id: 13, title: '13. なぐさめ' },
    { id: 14, title: '14. スティリエンヌ' },
    { id: 15, title: '15. バラード' },
    { id: 16, title: '16. あまいなげき' },
    { id: 17, title: '17. おしゃべり' },
    { id: 18, title: '18. 気がかり' },
    { id: 19, title: '19. アヴェ・マリア' },
    { id: 20, title: '20. タランテラ' },
    { id: 21, title: '21. 天使のハーモニー' },
    { id: 22, title: '22. 舟歌' },
    { id: 23, title: '23. 帰り道' },
    { id: 24, title: '24. つばめ' },
    { id: 25, title: '25. 貴婦人の乗馬' }
  ];

  // 曲の色マッピング（画像がない場合の代替表示用）
  const colorMapping = {
    1: '#FFCDD2', 2: '#F8BBD0', 3: '#E1BEE7', 4: '#D1C4E9', 5: '#C5CAE9',
    6: '#BBDEFB', 7: '#B3E5FC', 8: '#B2EBF2', 9: '#B2DFDB', 10: '#C8E6C9',
    11: '#DCEDC8', 12: '#F0F4C3', 13: '#FFF9C4', 14: '#FFECB3', 15: '#FFE0B2',
    16: '#FFCCBC', 17: '#D7CCC8', 18: '#F5F5F5', 19: '#CFD8DC', 20: '#B0BEC5',
    21: '#FFAB91', 22: '#BCAAA4', 23: '#EEEEEE', 24: '#B0BEC5', 25: '#FFD180'
  };

  // 初期ステート
  const initialState = {
    s: [],
    a: [],
    b: [],
    c: [],
    d: [],
    unassigned: [...burgmullerPieces.map(piece => piece.id)]
  };

  // 音声再生関連のステート
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const audioRef = useRef(null);

  // フォーム用のステート変数
  const [userName, setUserName] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);

  // ドラッグ＆ドロップの状態
  const [tierAssignments, setTierAssignments] = useState(initialState);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [dragStartX, setDragStartX] = useState(null); // ドラッグ開始のX座標を記録
  const [dragDirection, setDragDirection] = useState(null); // ドラッグの方向（左/右）を記録
  const [screenSize, setScreenSize] = useState('small'); // 画面サイズの状態
  
  // 自動スクロール機能のステート
  const [autoScrollActive, setAutoScrollActive] = useState(false);
  const [scrollDirection, setScrollDirection] = useState(null);
  const autoScrollRef = useRef(null);
  const scrollSpeed = 10; // スクロール速度 (px/フレーム)
  const scrollIntervalRef = useRef(null); // setInterval参照を保持
  const lastMousePositionRef = useRef({ x: 0, y: 0 }); // 最後のマウス位置を保持
  
  // カスタムドラッグビジュアル用のステート
  const [dragVisualPosition, setDragVisualPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // ティア要素への参照を保存
  const tierRefs = useRef({});
  // contentRef for PDF generation
  const contentRef = useRef(null);
  // ウィンドウサイズ測定用のRef
  const containerRef = useRef(null);
  // 名前とコメントの保持用Ref
  const userNameRef = useRef(userName);
  const commentRef = useRef(comment);

  // useStateの値をrefに同期
  useEffect(() => {
    userNameRef.current = userName;
    commentRef.current = comment;
  }, [userName, comment]);

  // 音声再生処理 - 1つだけの実装
  const handlePlayAudio = (pieceId) => {
    console.log('ダブルクリックされました。現在の再生ID:', currentlyPlaying, '新しいID:', pieceId);
    
    // 同じ曲をクリックしたら停止
    if (currentlyPlaying === pieceId) {
      console.log('同じ曲なので停止します');
      setCurrentlyPlaying(null);
    } else {
      // 別の曲を再生
      console.log('新しい曲を再生します');
      setCurrentlyPlaying(pieceId);
    }
  };

  // 音声再生の制御 - 複数曲に対応
  useEffect(() => {
    console.log('再生状態が変更されました:', currentlyPlaying);
    
    // 音声要素がなければ作成
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // 再生終了時のハンドラ
      audioRef.current.addEventListener('ended', () => {
        console.log('再生が終了しました');
        setCurrentlyPlaying(null);
      });
    }
    
    // 再生する曲が変わったとき
    if (currentlyPlaying !== null) {
      console.log(`曲${currentlyPlaying}を再生します`);
      // 動的にパスを構築して音声ファイルを読み込む
      const basePath = getBasePath();
      const audioPath = `${basePath}/audio/piece${currentlyPlaying}.mp3`;
      
      audioRef.current.src = audioPath;
      audioRef.current.play().catch(error => {
        console.error('音声再生エラー:', error);
        setCurrentlyPlaying(null);
      });
    } else {
      console.log('再生を停止します');
      // 再生停止
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
    
    // コンポーネントのクリーンアップ時に音声を停止
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentlyPlaying]);

  // デプロイ環境に基づいたベースパスを取得
  const getBasePath = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '';
    } else {
      return '/burgmuller-ranking'; // GitHub Pagesでのリポジトリ名
    }
  };

  // 画面サイズの監視と更新
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width > 1440) {
        setScreenSize('large'); // デスクトップや外部モニター
      } else if (width > 1024) {
        setScreenSize('medium'); // 大きめのノートPC
      } else {
        setScreenSize('small'); // 標準的なノートPC
      }
    };

    // 初期チェック
    checkScreenSize();
    
    // リサイズイベントリスナー
    window.addEventListener('resize', checkScreenSize);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // ドラッグ終了時に確実にドラッグビジュアルを非表示にするグローバルイベントリスナー
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setIsDragging(false);
      setDraggedPiece(null);
    };
    
    window.addEventListener('dragend', handleGlobalDragEnd);
    
    return () => {
      window.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);

  // スクロール位置を監視して、ドラッグ方向を決定する
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggedPiece && dragStartX !== null) {
        const direction = e.clientX < dragStartX ? 'left' : 'right';
        setDragDirection(direction);
        
        // ドラッグビジュアル用の位置を更新
        setDragVisualPosition({ x: e.clientX, y: e.clientY });
      }
      
      // マウス位置を記録（スクロール処理用）
      if (draggedPiece !== null) {
        lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [draggedPiece, dragStartX]);

  // ドラッグ中のスクロール処理の最適化版
  useEffect(() => {
    if (draggedPiece === null) {
      // ドラッグ中でない場合はインターバルをクリア
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      return;
    }
    
    // スクロール処理用インターバル関数
    const checkScrollPosition = () => {
      if (!draggedPiece) return; // ドラッグが終了した場合は何もしない
      
      const mouseY = lastMousePositionRef.current.y;
      const viewportHeight = window.innerHeight;
      const scrollThreshold = 80;
      
      // スクロール速度を調整（値を小さくすると滑らかに）
      const scrollSpeed = 3;
      
      if (mouseY < scrollThreshold) {
        // 上方向のスクロール - よりゆっくりと
        window.scrollBy(0, -scrollSpeed);
      } else if (mouseY > viewportHeight - scrollThreshold) {
        // 下方向のスクロール - よりゆっくりと
        window.scrollBy(0, scrollSpeed);
      }
    };
    
    // フレームレートを下げて負荷を軽減（20msec → 50msec）
    scrollIntervalRef.current = setInterval(checkScrollPosition, 50);
    
    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [draggedPiece]);
  
  const handleDragStart = (e, pieceId) => {
    setDraggedPiece(pieceId);
    setDragStartX(e.clientX);
    
    // ドラッグビジュアル用のステートを更新
    setIsDragging(true);
    setDragVisualPosition({ x: e.clientX, y: e.clientY });
    
    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
    
    e.dataTransfer.setData('text/plain', pieceId);
    e.dataTransfer.effectAllowed = 'move';
    
    // ブラウザのデフォルトドラッグイメージを完全に無効化する方法
    const emptyImg = new Image();
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(emptyImg, 0, 0);
  };

  // ドラッグ終了時の処理
  const handleDragEnd = () => {
    setDraggedPiece(null);
    setDragStartX(null);
    setDragDirection(null);
    
    // 確実にドラッグビジュアルを非表示に
    setIsDragging(false);
    
    // 自動スクロールを停止
    setAutoScrollActive(false);
    setScrollDirection(null);
    
    // インターバルをクリア
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  // ドラッグがコンテナ外に出た場合の処理
  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  // ドラッグオーバー時のデフォルト動作を防止（改善版）
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // ドラッグ中にマウス位置を更新（スクロール用）
    lastMousePositionRef.current = { x: e.clientX, y: e.clientY };
    
    // ドラッグビジュアルの位置も更新
    setDragVisualPosition({ x: e.clientX, y: e.clientY });
  };

  // ドロップ時の処理 - 行をまたぐ入れ替えに対応
  const handleDrop = (e, tierId) => {
    e.preventDefault();
    
    if (draggedPiece === null) return;
    
    // ドロップ先の要素を取得
    const dropTarget = e.target.closest('[data-piece-id]');
    const dropTargetId = dropTarget ? parseInt(dropTarget.getAttribute('data-piece-id')) : null;
    
    // 新しい割り当てオブジェクトを作成
    const newAssignments = {};
    
    // 各ティアをコピー
    Object.keys(tierAssignments).forEach(tier => {
      // ドラッグされた曲を除外
      newAssignments[tier] = [...tierAssignments[tier].filter(id => id !== draggedPiece)];
    });
    
    // ドラッグ元のティアを特定
    let dragSourceTier = Object.keys(tierAssignments).find(tier => 
      tierAssignments[tier].includes(draggedPiece)
    );
    
    // 同じティア内での移動かどうか
    if (tierId === dragSourceTier && dropTargetId && tierAssignments[tierId].includes(dropTargetId)) {
      const tierItems = [...newAssignments[tierId]];
      const dropTargetIndex = tierAssignments[tierId].indexOf(dropTargetId);
      
      // 行またぎの位置調整ロジック
      if (dragDirection) {
        const containerRect = tierRefs.current[tierId].getBoundingClientRect();
        const pieceWidth = dropTarget.offsetWidth;
        const rowCapacity = Math.floor(containerRect.width / pieceWidth);
        
        // ドロップ位置（左/右端）の特別処理
        const isAtRowEdge = (index, direction) => {
          if (direction === 'left') {
            return index % rowCapacity === 0; // 左端
          } else {
            return (index + 1) % rowCapacity === 0 || index === tierItems.length - 1; // 右端
          }
        };
        
        // ドラッグ元の位置
        const draggedIndex = tierAssignments[tierId].indexOf(draggedPiece);
        
        // 行をまたぐ移動の特別処理
        if (isAtRowEdge(dropTargetIndex, dragDirection) && 
            Math.floor(draggedIndex / rowCapacity) !== Math.floor(dropTargetIndex / rowCapacity)) {
          
          // 左方向へのドラッグの場合、前の行の最後に配置
          if (dragDirection === 'left' && dropTargetIndex % rowCapacity === 0 && dropTargetIndex > 0) {
            const targetPosition = dropTargetIndex - 1;
            tierItems.splice(targetPosition, 0, draggedPiece);
          } 
          // 右方向へのドラッグの場合、次の行の最初に配置
          else if (dragDirection === 'right' && 
                 ((dropTargetIndex + 1) % rowCapacity === 0 || dropTargetIndex === tierItems.length - 1)) {
            const targetPosition = dropTargetIndex + 1;
            if (targetPosition <= tierItems.length) {
              tierItems.splice(targetPosition, 0, draggedPiece);
            } else {
              tierItems.push(draggedPiece);
            }
          } else {
            // 通常のドロップ位置
            tierItems.splice(dropTargetIndex, 0, draggedPiece);
          }
        } else {
          // 通常のドロップ位置
          tierItems.splice(dropTargetIndex, 0, draggedPiece);
        }
      } else {
        // 方向が特定できない場合は通常のドロップ
        tierItems.splice(dropTargetIndex, 0, draggedPiece);
      }
      
      newAssignments[tierId] = tierItems;
    } else if (tierId !== 'unassigned' && dragSourceTier === tierId) {
      // 同じティア内で、特定のターゲットなしにドロップした場合は末尾に追加
      newAssignments[tierId].push(draggedPiece);
    } else {
      // 別のティアへの移動、または未分類への移動
      newAssignments[tierId].push(draggedPiece);
    }
    
    // ステートを更新
    setTierAssignments(newAssignments);
  };

  // リセットボタンのハンドラ
  const handleReset = () => {
    console.log("リセットボタンがクリックされました");
    // 完全に新しいオブジェクトで初期化
    setTierAssignments({...initialState});
    setDraggedPiece(null);
    setDragStartX(null);
    setDragDirection(null);
    // 注意: ユーザー名とコメントはリセットしない
  };

  // 送信ハンドラー関数
  const submitRanking = async (e) => {
    e.preventDefault();
    
    // 送信中フラグを立てる
    setIsSubmitting(true);
    setSubmitResult(null);
    
    try {
      // ランキング結果を整形
      const results = {};
      
      // ティアごとに曲を取得
      tiers.forEach(tier => {
        const pieces = tierAssignments[tier.id].map(id => {
          const piece = burgmullerPieces.find(p => p.id === id);
          return piece.title;
        });
        results[tier.label] = pieces;
      });
      
      // 未分類の曲も含める
      const unassignedPieces = tierAssignments.unassigned.map(id => {
        const piece = burgmullerPieces.find(p => p.id === id);
        return piece.title;
      });
      results['未ランク'] = unassignedPieces;
      
      // Google Apps Script または他のAPIエンドポイントにPOSTリクエスト
      const formData = {
        userName: userName,
        comment: comment,
        rankings: results,
        timestamp: new Date().toISOString()
      };
      
      // デモ用: 実際のAPIエンドポイントを設定していない場合はコメントアウト
      /*
      const response = await fetch('https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        mode: 'no-cors' // CORS対策
      });
      */
      
      // デモ用: 送信成功をシミュレート
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 送信結果をセット
      setSubmitResult({
        success: true,
        message: 'ランキングを送信しました。ありがとうございます！（デモ）'
      });
      
      console.log('送信されたランキング結果:', formData);
    } catch (error) {
      console.error('送信エラー:', error);
      setSubmitResult({
        success: false,
        message: 'エラーが発生しました。再度お試しください。'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 改善版PDFダウンロードハンドラ - 全ての行が見えるようにする
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // 一時的なコンテナを作成
      const container = document.createElement('div');
      container.style.padding = '20px';
      container.style.backgroundColor = 'white';
      container.style.width = '800px';  // 固定幅を設定
      
      // タイトル要素を作成
      const title = document.createElement('h1');
      title.textContent = 'ブルグミュラー25の練習曲 お気に入りランキング';
      title.style.textAlign = 'center';
      title.style.marginBottom = '20px';
      title.style.fontSize = '24px';
      container.appendChild(title);
      
      // ユーザー情報セクションを追加
      // refから最新の値を取得
      const currentUserName = userNameRef.current;
      const currentComment = commentRef.current;
      
      if (currentUserName) {
        const userInfo = document.createElement('div');
        userInfo.style.marginBottom = '20px';
        userInfo.style.padding = '10px';
        userInfo.style.border = '1px solid #d1d5db';
        userInfo.style.borderRadius = '4px';
        userInfo.style.backgroundColor = '#f9fafb';
        
        const nameElement = document.createElement('p');
        nameElement.style.margin = '0 0 5px 0';
        nameElement.style.fontWeight = 'bold';
        nameElement.textContent = `お名前: ${currentUserName}`;
        userInfo.appendChild(nameElement);
        
        if (currentComment) {
          const commentElement = document.createElement('p');
          commentElement.style.margin = '0';
          commentElement.style.whiteSpace = 'pre-wrap';
          commentElement.textContent = `コメント: ${currentComment}`;
          userInfo.appendChild(commentElement);
        }
        
        container.appendChild(userInfo);
      }
      
      // ティアリストを新たに構築
      const newTiersList = document.createElement('div');
      
      // すべてのティアを取得してコピー
      const originalTiers = document.getElementById('tiers-list').children;
      
      Array.from(originalTiers).forEach(tier => {
        const newTier = tier.cloneNode(true);
        // スタイルの再設定（クローンで継承されない場合に備えて）
        newTier.style.display = 'flex';
        newTier.style.marginBottom = '8px';
        newTier.style.border = '1px solid #d1d5db';
        
        // ティア内の曲要素コンテナを取得
        const piecesContainer = newTier.querySelector('div:nth-child(2)');
        
        // ティア内の曲が複数行になる場合でも全て表示されるようにスタイルを調整
        if (piecesContainer) {
          piecesContainer.style.flexWrap = 'wrap';
          piecesContainer.style.overflow = 'visible';
          piecesContainer.style.minHeight = 'auto';
          piecesContainer.style.maxHeight = 'none';
          
          // 各曲要素のスタイルを調整して、曲名が完全に表示されるように
          const pieceElements = piecesContainer.querySelectorAll('[data-piece-id]');
          pieceElements.forEach(element => {
            // 曲名のコンテナを取得
            const titleElement = element.querySelector('div:nth-child(2)');
            if (titleElement) {
              titleElement.style.maxHeight = 'none';
              titleElement.style.overflow = 'visible';
              titleElement.style.height = 'auto';
              titleElement.style.fontSize = '10px';
              titleElement.style.padding = '2px 0';
              titleElement.style.whiteSpace = 'normal'; // PDF内では改行可能に
            }
          });
        }
        
        // 中身のないティアも含めて全て表示
        newTiersList.appendChild(newTier);
      });
      
      container.appendChild(newTiersList);
      
      // 日付を追加
      const date = document.createElement('p');
      date.textContent = `作成日: ${new Date().toLocaleDateString('ja-JP')}`;
      date.style.textAlign = 'right';
      date.style.marginTop = '20px';
      date.style.fontSize = '12px';
      container.appendChild(date);
      
      // 一時的にDOMに追加（非表示で）
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      
      // html2canvasを使用して一時的なコンテナをキャプチャ
      const canvas = await html2canvas(container, {
        scale: 1.5, // 高解像度化
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'white'
      });
      
      // キャプチャが終わったら一時的なコンテナを削除
      document.body.removeChild(container);
      
      // PDFドキュメントを作成
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // キャンバスをPDFに追加
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // 用紙サイズに合わせてスケーリング
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // キャンバスのアスペクト比を維持しながらPDFに収める
      const canvasRatio = canvas.height / canvas.width;
      const imgWidth = pageWidth - 20; // 余白を考慮
      const imgHeight = imgWidth * canvasRatio;

// PDFへの追加
pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);

// ファイル名設定
let fileName = 'burgmuller-ranking.pdf';
if (currentUserName) {
  fileName = `burgmuller-ranking-${currentUserName.replace(/\s+/g, '_')}.pdf`;
}

// PDFをダウンロード
pdf.save(fileName);

console.log('PDFが生成されました');
} catch (error) {
console.error('PDF生成エラー:', error);
alert('PDFの生成中にエラーが発生しました。');
} finally {
setIsGeneratingPDF(false);
}
};

// 未分類の曲が0になったかどうかの判定
const isUnassignedEmpty = tierAssignments.unassigned.length === 0;

// 画面サイズに基づいたスタイル設定
const getSizeBasedStyle = (small, medium, large) => {
if (screenSize === 'large') return large;
if (screenSize === 'medium') return medium;
return small;
};

// 画面サイズに応じた曲アイテムの幅
const getPieceWidth = () => {
if (isUnassignedEmpty) {
  return getSizeBasedStyle(65, 85, 100); // 未分類が空の場合
} else {
  return getSizeBasedStyle(60, 80, 95); // 未分類がある場合
}
};

// 画面サイズに応じた画像サイズ
const getImageSize = () => {
if (isUnassignedEmpty) {
  return getSizeBasedStyle(45, 65, 85); // 未分類が空の場合
} else {
  return getSizeBasedStyle(40, 60, 75); // 未分類がある場合
}
};

// 画面サイズに応じたティア高さ（元のサイズより少し大きく、ただし見切れを防ぐ程度に）
const getTierHeight = () => {
if (isUnassignedEmpty) {
  return getSizeBasedStyle(65, 85, 105); // 未分類が空の場合、さらに小さく (70 → 65, 90 → 85, 110 → 105)
} else {
  return getSizeBasedStyle(60, 80, 100); // 未分類がある場合、さらに小さく (65 → 60, 85 → 80, 105 → 100)
}
};

// 画面サイズに応じた未分類エリアの高さ (曲名が見切れないよう+10px増加)
const getUnassignedHeight = () => {
if (isUnassignedEmpty) {
  return getSizeBasedStyle(35, 40, 45); // 未分類が空の場合（常に小さめ）
} else {
  return getSizeBasedStyle(65, 80, 95); // 未分類がある場合
}
};

// 画面サイズに応じたフォントサイズ (そのまま)
const getFontSize = () => {
if (isUnassignedEmpty) {
  return getSizeBasedStyle(8, 10, 12); // 未分類が空の場合
} else {
  return getSizeBasedStyle(7, 9, 11); // 未分類がある場合
}
};

// 曲名表示エリアの高さを調整
const getTitleHeight = () => {
if (isUnassignedEmpty) {
  return getSizeBasedStyle(20, 22, 24); // 未分類が空の場合、さらに小さく (24 → 20, 26 → 22, 28 → 24)
} else {
  return getSizeBasedStyle(18, 20, 22); // 未分類がある場合、さらに小さく (22 → 18, 24 → 20, 26 → 22)
}
};

// コンテナの最大幅の設定（画面サイズに応じて）
const getContainerMaxWidth = () => {
return getSizeBasedStyle(1200, 1440, '80%'); // ノートPCでは1200pxに縮小
};

// 画面全体の余白
const getBodyPadding = () => {
return getSizeBasedStyle(1, 4, 8); // ノートPCでは余白を最小限に
};

// 曲名を省略表示する関数
const getTruncatedTitle = (title) => {
// 長い曲名を持つIDを特定 (特にスティリエンヌやアヴェ・マリアなど)
const longTitleIds = [14, 19, 21, 25]; // スティリエンヌ、アヴェ・マリア、天使のハーモニー、貴婦人の乗馬

// 曲番号と曲名を分ける
const match = title.match(/^(\d+\.\s)(.+)$/);
if (match) {
  const [, number, name] = match;
  const id = parseInt(number);
  
  // 長い曲名の特別処理
  if (longTitleIds.includes(id)) {
    // 特に長い曲名は短く省略
    if (id === 14) return `${number}スティリエンヌ`;
    if (id === 19) return `${number}アヴェ・マリア`;
    if (id === 21) return `${number}天使のハーモニー`;
    if (id === 25) return `${number}貴婦人の乗馬`;
  }
  
  // 通常の長さチェック
  if (name.length > 6) {
    return `${number}${name.substring(0, 5)}..`;
  }
}
return title;
};
// 曲の要素を取得する関数（ダブルクリックで音声再生機能追加）
const getPieceElement = (pieceId) => {
  const piece = burgmullerPieces.find(p => p.id === pieceId);
  const basePath = getBasePath();

  const pieceWidth = getPieceWidth();
  const imageSize = getImageSize();
  const fontSize = getFontSize();
  const titleHeight = getTitleHeight();

  // 再生中かどうかのフラグ
  const isPlaying = currentlyPlaying === pieceId;

  return (
    <div
      key={pieceId}
      data-piece-id={pieceId}
      draggable
      onDragStart={(e) => handleDragStart(e, pieceId)}
      onDragEnd={handleDragEnd}
      onDoubleClick={() => handlePlayAudio(pieceId)} // ダブルクリックで音声再生
      style={{
        padding: '1px 1px 2px 1px', // 下部パディングを少し増やす
        margin: '1px',
        backgroundColor: isPlaying ? '#ecfdf5' : 'white', // 再生中は背景色を変える
        border: isPlaying ? '1px solid #10b981' : '1px solid #d1d5db', // 再生中は枠線の色を変える
        borderRadius: '2px', // 角丸を小さく
        cursor: 'move',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: `${pieceWidth}px`,
        height: 'auto', // 高さを内容に合わせる
        boxShadow: isPlaying ? '0 0 3px #10b981' : 'none', // 再生中は軽いシャドウ
        transition: 'all 0.3s ease',
        position: 'relative' // 再生アイコン用
      }}
      title={`${piece.title} (ダブルクリックで${isPlaying ? '停止' : '再生'})`} // ツールチップに再生情報追加
    >
      {/* 再生状態表示アイコン */}
      {isPlaying && (
        <div style={{
          position: 'absolute',
          top: '3px',
          right: '3px',
          backgroundColor: '#10b981',
          borderRadius: '50%',
          width: '12px',
          height: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2
        }}>
          <div style={{
            width: '4px',
            height: '4px',
            backgroundColor: 'white',
            borderRadius: '50%'
          }}></div>
        </div>
      )}
      
      <div 
        style={{
          width: `${imageSize}px`,
          height: `${imageSize}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '2px', // 角丸を小さく
          marginBottom: '1px', // 下部マージンを小さくする (2px → 1px)
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
      >
        <img 
          src={`${basePath}/images/piece${piece.id}.jpg`} 
          alt={piece.title}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            filter: isPlaying ? 'brightness(1.1)' : 'none' // 再生中は少し明るく
          }}
          onError={(e) => {
            // 画像読み込みエラー時の代替表示
            e.target.onerror = null;
            e.target.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
            // 親要素のスタイルを変更
            e.target.parentNode.style.backgroundColor = colorMapping[piece.id];
            // 番号を表示
            e.target.parentNode.innerHTML = `<span style="font-size: ${fontSize + 3}px; font-weight: bold;">${piece.id}</span>`;
          }}
        />
      </div>
      <div style={{ 
        fontSize: `${fontSize}px`,
        textAlign: 'center',
        lineHeight: '1.1', // 行の高さを削減 (1.25 → 1.1)
        height: `${titleHeight - 4}px`, // 全体の高さを4px削減
        display: 'flex',
        alignItems: 'flex-start', // 上部寄せに変更 (center → flex-start)
        justifyContent: 'center',
        width: '100%',
        overflow: 'visible',
        padding: '0px 1px 1px 1px', // 上部のパディングを0に (1px 1px → 0px 1px 1px 1px)
        transition: 'all 0.3s ease',
        whiteSpace: 'nowrap', // 改行を抑制 (normal → nowrap)
        textOverflow: 'ellipsis', // 長いテキストは省略 (clip → ellipsis)
        wordBreak: 'normal', // 単語の途中での改行を防止 (break-word → normal)
        fontWeight: isPlaying ? 'bold' : 'normal',
        maxWidth: '100%' // 最大幅を設定
      }}>
        {getTruncatedTitle(piece.title)} {/* 長い曲名は省略関数を使用 */}
      </div>
    </div>
  );
};

return (
  <div 
    ref={(el) => { 
      contentRef.current = el;
      containerRef.current = el;
    }} 
    style={{ 
      padding: getBodyPadding(),
      maxWidth: getContainerMaxWidth(),
      margin: '0 auto',
      maxHeight: '100vh', 
      boxSizing: 'border-box',
      transition: 'all 0.3s ease',
      backgroundColor: 'white', // 完全に不透明な背景を追加
      boxShadow: '0 0 10px rgba(0,0,0,0.1)' // 影を追加
    }}
  >
    {/* カスタムドラッグビジュアル - 簡素化版 */}
    {isDragging && draggedPiece && (
      <div
        style={{
          position: 'fixed',
          left: dragVisualPosition.x - 15,
          top: dragVisualPosition.y - 15,
          width: '30px',
          height: '30px',
          pointerEvents: 'none',
          zIndex: 9999,
          opacity: 0.8,
          backgroundColor: colorMapping[draggedPiece] || '#f3f4f6',
          border: '2px solid #3b82f6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold'
        }}
      >
        {draggedPiece}
      </div>
    )}

    {/* 現在再生中の曲に関する情報表示 */}
    {currentlyPlaying && (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: '#10b981',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '4px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 1000,
        fontSize: '12px'
      }}>
        <div>再生中: {burgmullerPieces.find(p => p.id === currentlyPlaying)?.title}</div>
        <div style={{ marginTop: '3px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setCurrentlyPlaying(null)}
            style={{
              backgroundColor: 'white',
              color: '#10b981',
              border: 'none',
              padding: '2px 6px',
              borderRadius: '2px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            停止
          </button>
        </div>
      </div>
    )}

    {/* ヘッダー部分 - タイトルとボタンを横並びに */}
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: getSizeBasedStyle(1, 2, 4), // マージンを最小限に
      transition: 'all 0.3s ease'
    }}>
      <h1 style={{ 
        fontSize: getSizeBasedStyle(15, 18, 22), // フォントサイズを最適化
        fontWeight: 'bold', 
        margin: '0',
        lineHeight: '1.1', // 行間を詰める
        transition: 'all 0.3s ease'
      }}>
        ブルグミュラー25の練習曲 お気に入りランキング
      </h1>
      
      <div style={{ 
        display: 'flex', 
        gap: getSizeBasedStyle(4, 6, 8), // ギャップを小さく
        transition: 'all 0.3s ease'
      }}>
        {/* 名前とコメント入力フォーム（ボタンの横） */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="お名前"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={{
              padding: getSizeBasedStyle('1px 3px', '2px 4px', '3px 6px'),
              fontSize: getSizeBasedStyle(10, 11, 12),
              border: '1px solid #d1d5db',
              borderRadius: '2px',
              width: getSizeBasedStyle(100, 120, 150)
            }}
          />
          <input
            type="text"
            placeholder="コメント"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={{
              padding: getSizeBasedStyle('1px 3px', '2px 4px', '3px 6px'),
              fontSize: getSizeBasedStyle(10, 11, 12),
              border: '1px solid #d1d5db',
              borderRadius: '2px',
              width: getSizeBasedStyle(150, 180, 220)
            }}
          />
        </div>
        
        <button
          onClick={handleReset}
          style={{
            padding: getSizeBasedStyle('2px 4px', '3px 6px', '4px 8px'), // パディングを小さく
            backgroundColor: '#6b7280',
            color: 'white',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: getSizeBasedStyle(10, 11, 12), // フォントサイズを小さく
            border: 'none',
            transition: 'all 0.3s ease'
          }}
        >
          リセット
        </button>
        
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          style={{
            padding: getSizeBasedStyle('2px 4px', '3px 6px', '4px 8px'), // パディングを小さく
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '2px',
            cursor: isGeneratingPDF ? 'not-allowed' : 'pointer',
            opacity: isGeneratingPDF ? 0.7 : 1,
            fontSize: getSizeBasedStyle(10, 11, 12), // フォントサイズを小さく
            border: 'none',
            transition: 'all 0.3s ease'
          }}
        >
          {isGeneratingPDF ? 'PDF生成中...' : 'PDFダウンロード'}
        </button>
      </div>
    </div>

    {/* 送信結果メッセージ（設定されている場合のみ表示） */}
    {submitResult && (
      <div style={{ 
        padding: '8px 12px', 
        marginBottom: '8px', 
        borderRadius: '4px',
        backgroundColor: submitResult.success ? '#dcfce7' : '#fee2e2',
        color: submitResult.success ? '#166534' : '#991b1b',
        fontSize: getSizeBasedStyle(11, 12, 13)
      }}>
        {submitResult.message}
      </div>
    )}

    {/* ティアリスト */}
    <div 
      id="tiers-list" 
      style={{ 
        marginBottom: getSizeBasedStyle(2, 3, 4), // マージンを小さく
        display: 'flex',
        flexDirection: 'column',
        gap: getSizeBasedStyle(1, 2, 3), // ギャップを小さく
        transition: 'all 0.3s ease'
      }}
    >
      {tiers.map(tier => (
        <div
          key={tier.id}
          onDrop={(e) => handleDrop(e, tier.id)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{ 
            display: 'flex', 
            marginBottom: '1px', // マージンを最小に
            border: '1px solid #d1d5db',
            transition: 'all 0.3s ease'
          }}
        >
          <div 
            style={{ 
              width: getSizeBasedStyle(20, 30, 40), // さらに幅を小さく
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 'bold',
              backgroundColor: tier.color,
              fontSize: getSizeBasedStyle(13, 15, 17), // フォントサイズを小さく
              transition: 'all 0.3s ease'
            }}
          >
            {tier.label}
          </div>
          <div 
            ref={el => tierRefs.current[tier.id] = el} // ティア要素への参照を保存
            style={{ 
              flex: '1', 
              minHeight: `${getTierHeight()}px`,
              maxHeight: `${getTierHeight()}px`,
              padding: '2px', // パディングを少し増やす
              backgroundColor: '#f3f4f6', 
              display: 'flex', 
              flexWrap: 'wrap',
              alignContent: 'flex-start', // 上揃えでラップ
              overflow: 'auto',
              transition: 'all 0.3s ease'
            }}
          >
            {tierAssignments[tier.id].map(pieceId => getPieceElement(pieceId))}
            {tierAssignments[tier.id].length === 0 && (
              <span style={{ 
                color: '#9ca3af', 
                padding: '0 4px',
                fontSize: getSizeBasedStyle(9, 10, 11), // フォントサイズを小さく
                display: 'flex',
                alignItems: 'center',
                height: '100%'
              }}>
                曲をここにドラッグ
              </span>
            )}
          </div>
        </div>
      ))}
    </div>

    {/* 未割り当て曲 - 常に表示するが高さを調整 */}
    <div 
      id="unassigned-section" 
      style={{ 
        marginTop: '1px', // マージンを最小に
        marginBottom: '1px', // マージンを最小に
        transition: 'all 0.3s ease'
      }}
    >
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '1px', // マージンを最小に
        fontSize: getSizeBasedStyle(10, 11, 13), // フォントサイズを小さく
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        transition: 'all 0.3s ease'
      }}>
        <span>未分類の曲:</span>
        {isUnassignedEmpty && (
          <span style={{ 
            fontSize: getSizeBasedStyle(8, 9, 10), // フォントサイズを小さく
            color: '#6b7280'
          }}>
            すべての曲が分類されています
          </span>
        )}
      </div>
      <div
        ref={el => tierRefs.current['unassigned'] = el} // 未分類エリアへの参照を保存
        onDrop={(e) => handleDrop(e, 'unassigned')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        style={{ 
          padding: '2px', // パディングを増やす
          border: '1px solid #d1d5db', 
          backgroundColor: '#f3f4f6', 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: '1px', // ギャップを最小に
          minHeight: `${getUnassignedHeight()}px`,
          maxHeight: `${getUnassignedHeight()}px`,
          overflowY: 'auto',
          alignContent: 'flex-start', // 上揃えでラップ
          transition: 'all 0.3s ease'
        }}
      >
        {tierAssignments.unassigned.map(pieceId => getPieceElement(pieceId))}
        {tierAssignments.unassigned.length === 0 && (
          <span style={{ 
            color: '#9ca3af', 
            padding: '0 4px',
            fontSize: getSizeBasedStyle(9, 10, 11), // フォントサイズを小さく
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            width: '100%',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            ここにドラッグして未分類に戻せます
          </span>
        )}
      </div>
    </div>

    {/* ランキング送信ボタン */}
    <div style={{ 
      marginTop: '8px',
      marginBottom: '8px',
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
      <button
        onClick={submitRanking}
        disabled={isSubmitting}
        style={{ 
          padding: getSizeBasedStyle('2px 4px', '3px 6px', '4px 8px'),
          backgroundColor: '#10b981', // グリーン
          color: 'white', 
          borderRadius: '2px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.5 : 1,
          fontSize: getSizeBasedStyle(10, 11, 12),
          border: 'none'
        }}
      >
        {isSubmitting ? '送信中...' : 'ランキングを送信する'}
      </button>
    </div>

    {/* クレジット表示 */}
    <div style={{ 
      fontSize: getSizeBasedStyle(7, 8, 9), // フォントサイズを最小に
      color: '#9ca3af', 
      textAlign: 'right',
      marginTop: '1px', // マージンを最小に
      transition: 'all 0.3s ease'
    }}>
      作成日: {new Date().toLocaleDateString('ja-JP')}
    </div>
  </div>
);
};

export default BurgmullerTierList;