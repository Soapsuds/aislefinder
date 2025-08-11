import React, { useState } from 'react';

const AisleFinder = () => {
  const [file, setFile] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [groceryList, setGroceryList] = useState('');
  const [error, setError] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeSearchLoading, setStoreSearchLoading] = useState(false);
  const [organizeByCategory, setOrganizeByCategory] = useState(false);

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/plain') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid text file');
      setFile(null);
    }
  };

  const searchStores = async () => {
    if (!zipCode.trim()) {
      setError('Please enter a zip code');
      return;
    }

    setStoreSearchLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5001/api/find-stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zipCode: zipCode.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to search stores');
      }

      const result = await response.json();
      setStores(result.stores || []);
      
      if (result.stores && result.stores.length > 0) {
        setSelectedStore(result.stores[0]); // Auto-select first store
      }
    } catch (err) {
      setError('Error searching stores: ' + err.message);
      setStores([]);
    } finally {
      setStoreSearchLoading(false);
    }
  };

  const processGroceryList = async () => {
    if (!file && !textInput.trim()) {
      setError('Please select a file or enter grocery items');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      
      if (file) {
        formData.append('file', file);
      } else {
        // Create a blob from text input
        const blob = new Blob([textInput], { type: 'text/plain' });
        formData.append('file', blob, 'grocery-list.txt');
      }
      
      formData.append('output_format', organizeByCategory ? 'category' : 'aisle');
      formData.append('store_id', selectedStore ? selectedStore.id : '01400943');
      formData.append('store', selectedStore ? selectedStore.name : '4500S Smiths');

      const response = await fetch('http://localhost:5001/api/process-grocery-list', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process grocery list');
      }

      const result = await response.text();
      setGroceryList(result);
    } catch (err) {
      setError('Error processing grocery list: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(groceryList);
      alert('Grocery list copied to clipboard!');
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const renderMarkdown = (text) => {
    return text
      .replace(/^## (.*$)/gim, '<h3 style="color: #2c3e50; margin: 15px 0 8px 0; font-size: 16px; font-weight: 600;">$1</h3>')
      .replace(/^- (.*$)/gim, '<div style="margin: 3px 0; padding-left: 15px; font-size: 13px;">• $1</div>')
      .replace(/\n/gim, '<br>');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'white',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '40px',
          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)'
        }}>
          <h1 style={{ 
            color: 'white', 
            margin: '0', 
            fontSize: '2rem',
            fontWeight: '700',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '15px',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)' 
          }}>
            Aisle Finder
          </h1>
        </div>

        {/* Store Finder Section */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '1rem', fontWeight: '600' }}>
            Find my Kroger
          </h3>
          <p style={{ margin: '0 0 10px 0', fontSize: '10px', color: '#6c757d' }}>
            Includes Pick 'N Save, Harris Teeter, Ralphs, King Soopers, City Market, Dillons, Smith's, Fry's, QFC, and more
          </p>
          
          {/* Radio Button Selection */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="organizationMode"
                  checked={!organizeByCategory}
                  onChange={() => setOrganizeByCategory(false)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: '#2c3e50' }}>Find my store for aisle-specific organization</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="organizationMode"
                  checked={organizeByCategory}
                  onChange={() => setOrganizeByCategory(true)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: '#2c3e50' }}>Organize by category instead</span>
              </label>
            </div>
          </div>
          
          {!organizeByCategory && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="Enter ZIP code"
                style={{
                  padding: '8px 12px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '6px',
                  fontSize: '13px',
                  minWidth: '150px',
                  transition: 'border-color 0.3s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#28a745'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
              />
              <button
                onClick={searchStores}
                disabled={storeSearchLoading}
                style={{
                  background: storeSearchLoading ? '#bdc3c7' : '#28a745',
                  color: 'white',
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: storeSearchLoading ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: storeSearchLoading ? 'none' : '0 2px 8px rgba(40, 167, 69, 0.3)'
                }}
              >
                {storeSearchLoading ? 'Searching...' : 'Find Stores'}
              </button>
            </div>
          )}

          {stores.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '16px', color: '#2c3e50' }}>
                Select Store:
              </label>
              <select
                value={selectedStore ? selectedStore.id : ''}
                onChange={(e) => {
                  const store = stores.find(s => s.id === e.target.value);
                  setSelectedStore(store);
                }}
                style={{
                  padding: '12px 16px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '8px',
                  fontSize: '16px',
                  width: '100%',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name} - {store.address} ({store.distance?.toFixed(1)} mi)
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedStore && (
            <div style={{ 
              marginTop: '15px', 
              padding: '15px', 
              background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', 
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.3)'
            }}>
              <p style={{ margin: '0', fontSize: '14px', color: '#2c3e50', fontWeight: '500' }}>
                Selected: <strong>{selectedStore.name}</strong><br/>
                {selectedStore.address}
              </p>
            </div>
          )}
        </div>
      
        {/* Grocery List Input Section */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50', fontSize: '1rem', fontWeight: '600' }}>
            Your Grocery List
          </h3>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
            {/* Text Input Section */}
            <div style={{ flex: '1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px', color: '#2c3e50' }}>
                Type or Paste Items:
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter grocery items, one per line:&#10;milk&#10;bread&#10;eggs&#10;apples"
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '10px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                  resize: 'vertical',
                  overflowY: 'auto',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  backgroundColor: 'white'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
              />
            </div>

            {/* File Upload Section */}
            <div style={{ flex: '1', paddingLeft: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px', color: '#2c3e50' }}>
                Or Upload Text File:
              </label>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              />
              
              {file && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '8px 10px', 
                  backgroundColor: '#d4edda', 
                  borderRadius: '6px',
                  border: '1px solid #c3e6cb'
                }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#155724', fontWeight: '500' }}>
                    Selected: <strong>{file.name}</strong>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Process Button */}
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <button
            onClick={processGroceryList}
            disabled={(!file && !textInput.trim()) || loading}
            style={{
              background: (!file && !textInput.trim()) || loading ? '#bdc3c7' : '#28a745',
              color: 'white',
              padding: '10px 25px',
              border: 'none',
              borderRadius: '25px',
              cursor: (!file && !textInput.trim()) || loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: (!file && !textInput.trim()) || loading ? 'none' : '0 4px 15px rgba(40, 167, 69, 0.3)',
              transform: (!file && !textInput.trim()) || loading ? 'none' : 'translateY(-1px)'
            }}
            onMouseEnter={(e) => {
              if (!((!file && !textInput.trim()) || loading)) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!((!file && !textInput.trim()) || loading)) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 15px rgba(40, 167, 69, 0.3)';
              }
            }}
          >
            {loading ? 'Processing...' : 'Organize My List'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#ff6b6b',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '30px',
            fontSize: '16px',
            fontWeight: '500',
            boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)'
          }}>
            {error}
          </div>
        )}

        {/* Results Section */}
        {groceryList && (
          <div style={{ 
            marginTop: '15px',
            padding: '15px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '1rem', fontWeight: '600' }}>
                Your Organized Shopping List
              </h3>
              <button
                onClick={copyToClipboard}
                style={{
                  background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                  color: 'white',
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(78, 205, 196, 0.3)'
                }}
              >
                Copy to Clipboard
              </button>
            </div>
            
            <div 
              style={{
                backgroundColor: 'white',
                padding: '15px',
                borderRadius: '6px',
                border: '2px solid #e9ecef',
                maxHeight: '300px',
                overflowY: 'auto',
                color: '#2c3e50'
              }}
              dangerouslySetInnerHTML={{
                __html: renderMarkdown(groceryList)
              }}
            />
          </div>
        )}

        {/* Tip Jar Section */}
        <div style={{ 
          marginTop: '25px',
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid #e9ecef',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 5px 0', color: '#2c3e50', fontSize: '14px', fontWeight: '600' }}>
            Tip Jar
          </h4>
          <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#6c757d' }}>
            Found this helpful? Consider buying me some groceries!
          </p>
          <a
            href="https://www.paypal.com/donate/?business=ECTSEQ2MFSE4Y&no_recurring=0&item_name=Thanks+for+supporting+Aisle+Finder%21+Your+donation+pays+for+development+and+hosting+costs.&currency_code=USD"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #ffc439 0%, #ff7730 100%)',
              color: 'white',
              padding: '6px 15px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 8px rgba(255, 196, 57, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(255, 196, 57, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0px)';
              e.target.style.boxShadow = '0 2px 8px rgba(255, 196, 57, 0.3)';
            }}
          >
            Support via PayPal
          </a>
        </div>
      </div>
    </div>
  );
};

export default AisleFinder;