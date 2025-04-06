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
    { id: 7, title: '7. 清らかな小川' },
    { id: 8, title: '8. 優美' },
    { id: 9, title: '9. 狩' },
    { id: 10, title: '10. やさしい花' },
    { id: 11, title: '11. せきれい' },
    { id: 12, title: '12. 別れ' },
    { id: 13, title: '13. なぐさめ' },
    { id: 14, title: '14. スティリアの女' },
    { id: 15, title: '15. バラード' },
    { id: 16, title: '16. 小さな嘆き' },
    { id: 17, title: '17. おしゃべり' },
    { id: 18, title: '18. 心配' },
    { id: 19, title: '19. アヴェ・マリア' },
    { id: 20, title: '20. タランテラ' },
    { id: 21, title: '21. 天使の声' },
    { id: 22, title: '22. 舟歌' },
    { id: 23, title: '23. 帰途' },
    { id: 24, title: '24. つばめ' },
    { id: 25, title: '25. 貴婦人の乗馬' }
  ];

  // 初期ステート
  const initialState = {
    s: [],
    a: [],
    b: [],
    c: [],
    d: [],
    unassigned: [...burgmullerPieces.map(piece => piece.id)]
  };

  // ドラッグ＆ドロップの状態
  const [tierAssignments, setTierAssignments] = useState(initialState);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [dragStartX, setDragStartX] = useState(null); // ドラッグ開始のX座標を記録
  const [dragDirection, setDragDirection] = useState(null); // ドラッグの方向（左/右）を記録
  
  // ティア要素への参照を保存
  const tierRefs = useRef({});
  // contentRef for PDF generation
  const contentRef = useRef(null);

  // スクロール位置を監視して、ドラッグ方向を決定する
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (draggedPiece && dragStartX !== null) {
        const direction = e.clientX < dragStartX ? 'left' : 'right';
        setDragDirection(direction);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [draggedPiece, dragStartX]);
  
  // ドラッグ開始時の処理
  const handleDragStart = (e, pieceId) => {
    setDraggedPiece(pieceId);
    setDragStartX(e.clientX); // ドラッグ開始位置を記録
    
    // データ転送オブジェクトの設定
    e.dataTransfer.setData('text/plain', pieceId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // ドラッグ終了時の処理
  const handleDragEnd = () => {
    setDraggedPiece(null);
    setDragStartX(null);
    setDragDirection(null);
  };

  // ドラッグオーバー時のデフォルト動作を防止
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
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
      
      // コンテナのスタイルを調整して、全体が見えるようにする
      setTimeout(async () => {
        try {
          // HTML2Canvasでキャプチャ
          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            // 重要: スクロールせずに全体が見えるようにする
            windowHeight: 10000,
            // コンテナの実際の高さを使用
            height: container.scrollHeight,
            width: container.offsetWidth
          });
          
          // DOMから削除
          document.body.removeChild(container);
          
          // PDFサイズ計算
          const imgWidth = 210; // A4幅 (mm)
          const pageHeight = 297; // A4高さ (mm)
          let imgHeight = canvas.height * imgWidth / canvas.width;
          
          // A4サイズに収まるかチェック
          const pdf = new jsPDF('p', 'mm', 'a4');
          
          // 必要に応じて複数ページに分割
          if (imgHeight > pageHeight) {
            // 1ページに収まらない場合は、縮小する
            const ratio = pageHeight / imgHeight;
            imgHeight = pageHeight * 0.9; // 余白のために90%
            const adjustedWidth = imgWidth * ratio * 0.9; 
            
            // センタリングのためのオフセット
            const xOffset = (imgWidth - adjustedWidth) / 2;
            
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xOffset, 10, adjustedWidth, imgHeight);
          } else {
            // 1ページに収まる場合はそのまま
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 10, imgWidth, imgHeight);
          }
          
          // PDFダウンロード
          pdf.save('burgmuller-ranking.pdf');
          setIsGeneratingPDF(false);
        } catch (error) {
          console.error('PDF生成エラー:', error);
          alert('PDFの生成中にエラーが発生しました。');
          setIsGeneratingPDF(false);
        }
      }, 100); // 少し遅延させてDOMが確実に構築されるようにする
    } catch (error) {
      console.error('PDF生成エラー:', error);
      alert('PDFの生成中にエラーが発生しました。');
      setIsGeneratingPDF(false);
    }
  };

  // 色に基づくカラーマッピング（HTMLカラーコード）
  const colorMapping = {
    1: '#fbcfe8', 2: '#e9d5ff', 3: '#bbf7d0', 4: '#fef08a', 
    5: '#bfdbfe', 6: '#fecaca', 7: '#fed7aa', 8: '#99f6e4', 
    9: '#c4b5fd', 10: '#e5e7eb', 11: '#fbcfe8', 12: '#e9d5ff', 
    13: '#bbf7d0', 14: '#fef08a', 15: '#bfdbfe', 16: '#fecaca', 
    17: '#fed7aa', 18: '#99f6e4', 19: '#c4b5fd', 20: '#e5e7eb',
    21: '#fbcfe8', 22: '#e9d5ff', 23: '#bbf7d0', 24: '#fef08a', 
    25: '#bfdbfe'
  };

  // GitHub Pagesでのベースパスを取得
  const getBasePath = () => {
    // ローカル環境とGitHub Pages環境で異なるパスを返す
    // window.location.hostnameが'localhost'または'127.0.0.1'の場合はローカル環境
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '';
    } else {
      return '/burgmuller-ranking'; // GitHub Pagesでのリポジトリ名
    }
  };

  // 未分類の曲が0になったかどうかの判定
  const isUnassignedEmpty = tierAssignments.unassigned.length === 0;

  // 曲の要素を取得する関数（改善版）
  const getPieceElement = (pieceId) => {
    const piece = burgmullerPieces.find(p => p.id === pieceId);
    const basePath = getBasePath();
    
    return (
      <div
        key={pieceId}
        data-piece-id={pieceId}
        draggable
        onDragStart={(e) => handleDragStart(e, pieceId)}
        onDragEnd={handleDragEnd}
        style={{
          padding: '2px',
          margin: '1px',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '3px',
          cursor: 'move',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: isUnassignedEmpty ? '85px' : '75px', // 未分類が空の場合は幅を広げる
          boxShadow: '0 1px 1px rgba(0,0,0,0.05)'
        }}
      >
        <div 
          style={{
            width: isUnassignedEmpty ? '75px' : '65px', // 未分類が空の場合は幅を広げる
            height: isUnassignedEmpty ? '75px' : '65px', // 未分類が空の場合は高さを広げる
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '3px',
            marginBottom: '1px',
            overflow: 'hidden'
          }}
        >
          <img 
            src={`${basePath}/images/piece${piece.id}.jpg`} 
            alt={piece.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              // 画像読み込みエラー時の代替表示
              e.target.onerror = null;
              e.target.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
              // 親要素のスタイルを変更
              e.target.parentNode.style.backgroundColor = colorMapping[piece.id];
              // 番号を表示
              e.target.parentNode.innerHTML = `<span style="font-size: 14px; font-weight: bold;">${piece.id}</span>`;
            }}
          />
        </div>
        <div style={{ 
          fontSize: isUnassignedEmpty ? '10px' : '8px', // 未分類が空の場合はフォントサイズを大きく
          textAlign: 'center',
          lineHeight: '1.1',
          height: isUnassignedEmpty ? '24px' : '18px', // 未分類が空の場合は高さを広げる
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          overflow: 'hidden',
          padding: '0 2px'
        }}>
          {piece.title}
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={contentRef} 
      style={{ 
        padding: '4px',
        maxWidth: '1280px', 
        margin: '0 auto',
        maxHeight: '100vh', 
        boxSizing: 'border-box'
      }}
    >
      {/* ヘッダー部分 - タイトルとボタンを横並びに */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '4px'
      }}>
        <h1 style={{ 
          fontSize: '18px',
          fontWeight: 'bold', 
          margin: '0',
          lineHeight: '1.2'
        }}>
          ブルグミュラー25の練習曲 お気に入りランキング
        </h1>
        
        <div style={{ 
          display: 'flex', 
          gap: '8px',
        }}>
          <button
            onClick={handleReset}
            style={{
              padding: '4px 8px',
              backgroundColor: '#6b7280',
              color: 'white',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
              border: 'none'
            }}
          >
            リセット
          </button>
          
          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '3px',
              cursor: isGeneratingPDF ? 'not-allowed' : 'pointer',
              opacity: isGeneratingPDF ? 0.7 : 1,
              fontSize: '12px',
              border: 'none'
            }}
          >
            {isGeneratingPDF ? 'PDF生成中...' : 'PDFダウンロード'}
          </button>
        </div>
      </div>
      
      {/* ティアリスト */}
      <div 
        id="tiers-list" 
        style={{ 
          marginBottom: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          transition: 'all 0.3s ease'
        }}
      >
        {tiers.map(tier => (
          <div
            key={tier.id}
            onDrop={(e) => handleDrop(e, tier.id)}
            onDragOver={handleDragOver}
            style={{ 
              display: 'flex', 
              marginBottom: '2px',
              border: '1px solid #d1d5db'
            }}
          >
            <div 
              style={{ 
                width: '30px',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold',
                backgroundColor: tier.color,
                fontSize: '16px'
              }}
            >
              {tier.label}
            </div>
            <div 
              ref={el => tierRefs.current[tier.id] = el} // ティア要素への参照を保存
              style={{ 
                flex: '1', 
                minHeight: isUnassignedEmpty ? '80px' : '66px', // 未分類が空の場合は高さを広げる
                maxHeight: isUnassignedEmpty ? '80px' : '66px', // 未分類が空の場合は高さを広げる
                padding: '2px',
                backgroundColor: '#f3f4f6', 
                display: 'flex', 
                flexWrap: 'wrap',
                overflow: 'auto',
                transition: 'all 0.3s ease'
              }}
            >
              {tierAssignments[tier.id].map(pieceId => getPieceElement(pieceId))}
              {tierAssignments[tier.id].length === 0 && (
                <span style={{ 
                  color: '#9ca3af', 
                  padding: '0 4px',
                  fontSize: '11px',
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
          marginTop: '4px', 
          marginBottom: '4px',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: '2px',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>未分類の曲:</span>
          {isUnassignedEmpty && (
            <span style={{ fontSize: '10px', color: '#6b7280' }}>
              すべての曲が分類されています
            </span>
          )}
        </div>
        <div
          ref={el => tierRefs.current['unassigned'] = el} // 未分類エリアへの参照を保存
          onDrop={(e) => handleDrop(e, 'unassigned')}
          onDragOver={handleDragOver}
          style={{ 
            padding: '4px',
            border: '1px solid #d1d5db', 
            backgroundColor: '#f3f4f6', 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '1px',
            minHeight: isUnassignedEmpty ? '40px' : '80px', // 未分類が空の場合は高さを小さく
            maxHeight: isUnassignedEmpty ? '40px' : '80px', // 未分類が空の場合は高さを小さく
            overflowY: 'auto',
            transition: 'all 0.3s ease'
          }}
        >
          {tierAssignments.unassigned.map(pieceId => getPieceElement(pieceId))}
          {tierAssignments.unassigned.length === 0 && (
            <span style={{ 
              color: '#9ca3af', 
              padding: '0 4px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              width: '100%',
              justifyContent: 'center'
            }}>
              ここにドラッグして未分類に戻せます
            </span>
          )}
        </div>
      </div>
      
      {/* クレジット表示 */}
      <div style={{ 
        fontSize: '9px', 
        color: '#9ca3af', 
        textAlign: 'right',
        marginTop: '2px'
      }}>
        作成日: {new Date().toLocaleDateString('ja-JP')}
      </div>
    </div>
  );
};

export default BurgmullerTierList;