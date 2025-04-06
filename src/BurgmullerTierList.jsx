import React, { useState, useRef } from 'react';
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
  
  // contentRef for PDF generation
  const contentRef = useRef(null);
  
  // ドラッグ開始時の処理
  const handleDragStart = (e, pieceId) => {
    setDraggedPiece(pieceId);
  };

  // ドラッグ終了時の処理
  const handleDragEnd = () => {
    setDraggedPiece(null);
  };

  // ドロップ時の処理
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
    
    // 同じティア内で順序変更の場合
    if (tierId !== 'unassigned' && tierAssignments[tierId].includes(draggedPiece) && dropTargetId && draggedPiece !== dropTargetId) {
      // 同じティア内での並べ替え
      const tierItems = [...newAssignments[tierId]];
      const dropTargetIndex = tierItems.indexOf(dropTargetId);
      
      if (dropTargetIndex !== -1) {
        // ドロップターゲットの位置に挿入
        tierItems.splice(dropTargetIndex, 0, draggedPiece);
        newAssignments[tierId] = tierItems;
      } else {
        // ターゲットが見つからない場合は末尾に追加
        newAssignments[tierId].push(draggedPiece);
      }
    } else {
      // 別のティアへの移動、または未分類への移動
      newAssignments[tierId].push(draggedPiece);
    }
    
    // ステートを更新
    setTierAssignments(newAssignments);
  };
  
  // ドラッグオーバー時のデフォルト動作を防止
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // リセットボタンのハンドラ
  const handleReset = () => {
    console.log("リセットボタンがクリックされました");
    // 完全に新しいオブジェクトで初期化
    setTierAssignments({...initialState});
    setDraggedPiece(null);
  };

  // 全ランク表示対応のPDFダウンロードハンドラ
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
            // スクロールウィンドウを無限に設定
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
            imgHeight = pageHeight;
            const adjustedWidth = imgWidth * ratio;
            
            // センタリングのためのオフセット
            const xOffset = (imgWidth - adjustedWidth) / 2;
            
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xOffset, 0, adjustedWidth, imgHeight);
          } else {
            // 1ページに収まる場合はそのまま
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
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

  // 曲の要素を取得する関数（コンパクト版）
  const getPieceElement = (pieceId) => {
    const piece = burgmullerPieces.find(p => p.id === pieceId);
    
    return (
      <div
        key={pieceId}
        data-piece-id={pieceId}
        draggable
        onDragStart={(e) => handleDragStart(e, pieceId)}
        onDragEnd={handleDragEnd}
        style={{
          padding: '4px',  // 縮小: 8px → 4px
          margin: '2px',   // 縮小: 4px → 2px
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '4px',
          cursor: 'move',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '90px'    // 縮小: 100px → 90px
        }}
      >
        <div 
          style={{
            width: '70px',  // 縮小: 80px → 70px
            height: '70px', // 縮小: 80px → 70px
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            marginBottom: '2px', // 縮小: 4px → 2px
            overflow: 'hidden'
          }}
        >
          <img 
            src={`/images/piece${piece.id}.jpg`} 
            alt={piece.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              // 画像読み込みエラー時の代替表示
              e.target.onerror = null;
              e.target.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
              // 親要素のスタイルを変更
              e.target.parentNode.style.backgroundColor = colorMapping[piece.id];
              // 番号を表示
              e.target.parentNode.innerHTML = `<span style="font-size: 16px; font-weight: bold;">${piece.id}</span>`;
            }}
          />
        </div>
        <div style={{ fontSize: '10px', textAlign: 'center' }}>{piece.title}</div>
      </div>
    );
  };

  return (
    <div ref={contentRef} style={{ padding: '8px', maxWidth: '1280px', margin: '0 auto' }}> {/* 縮小: 16px → 8px */}
      <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}> {/* 縮小: 24px → 20px, 16px → 8px */}
        ブルグミュラー25の練習曲 お気に入りランキング
      </h1>
      <p style={{ marginBottom: '8px', textAlign: 'center', color: '#4b5563' }}> {/* 縮小: 16px → 8px */}
        各曲をドラッグ＆ドロップして、お気に入りの曲をランク付けしましょう
      </p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}> {/* 縮小: 16px → 8px */}
        <button
          onClick={handleReset}
          style={{
            padding: '6px 12px',  // 縮小: 8px 16px → 6px 12px
            backgroundColor: '#6b7280',
            color: 'white',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          リセット
        </button>
        
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          style={{
            padding: '6px 12px',  // 縮小: 8px 16px → 6px 12px
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '4px',
            cursor: isGeneratingPDF ? 'not-allowed' : 'pointer',
            opacity: isGeneratingPDF ? 0.7 : 1
          }}
        >
          {isGeneratingPDF ? 'PDF生成中...' : 'PDFダウンロード'}
        </button>
      </div>
      
      {/* ティアリスト */}
      <div id="tiers-list" style={{ marginBottom: '16px' }}> {/* 縮小: 32px → 16px */}
        {tiers.map(tier => (
          <div
            key={tier.id}
            onDrop={(e) => handleDrop(e, tier.id)}
            onDragOver={handleDragOver}
            style={{ display: 'flex', marginBottom: '4px', border: '1px solid #d1d5db' /* 縮小: 8px → 4px */ }}
          >
            <div 
              style={{ 
                width: '40px',  // 縮小: 64px → 40px
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 'bold',
                backgroundColor: tier.color
              }}
            >
              {tier.label}
            </div>
            <div 
              style={{ 
                flex: '1', 
                minHeight: '90px',  // 縮小: 128px → 90px
                padding: '4px',     // 縮小: 8px → 4px
                backgroundColor: '#f3f4f6', 
                display: 'flex', 
                flexWrap: 'wrap' 
              }}
            >
              {tierAssignments[tier.id].map(pieceId => getPieceElement(pieceId))}
            </div>
          </div>
        ))}
      </div>
      
      {/* 未割り当て曲 */}
      <div id="unassigned-section" style={{ marginTop: '8px', marginBottom: '16px' }}> {/* 縮小: 16px → 8px, 32px → 16px */}
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>未分類の曲:</div> {/* 縮小: 8px → 4px */}
        <div
          onDrop={(e) => handleDrop(e, 'unassigned')}
          onDragOver={handleDragOver}
          style={{ 
            padding: '8px',   // 縮小: 16px → 8px
            border: '1px solid #d1d5db', 
            backgroundColor: '#f3f4f6', 
            display: 'flex', 
            flexWrap: 'wrap',
            maxHeight: '240px', // 縮小: 400px → 240px
            overflowY: 'auto'
          }}
        >
          {tierAssignments.unassigned.map(pieceId => getPieceElement(pieceId))}
        </div>
      </div>
    </div>
  );
};

export default BurgmullerTierList;