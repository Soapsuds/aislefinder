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
  const [organizeByCategory, setOrganizeByCategory] = useState(true);
  const [hasSearchedStores, setHasSearchedStores] = useState(false);
  
  const isValidZipCode = (zip) => /^\d{5}(-\d{4})?$/.test(zip.trim());
  
  const shouldShowZipError = (zip) => {
    const trimmed = zip.trim();
    if (!trimmed) return false; // Don't show error for empty field
    if (/^\d{1,5}$/.test(trimmed)) return false; // Still typing valid digits (1-5 digits)
    if (/^\d{5}-\d{1,4}$/.test(trimmed)) return false; // Still typing extended format
    return !isValidZipCode(trimmed); // Show error for invalid formats
  };

  // Shared button style
  const buttonStyle = {
    background: '#88C976',
    color: 'white',
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(136, 201, 118, 0.3)'
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    background: '#bdc3c7',
    cursor: 'not-allowed',
    boxShadow: 'none'
  };

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

    // Validate ZIP code format
    if (!isValidZipCode(zipCode)) {
      // Don't call setError here, we'll handle this in the UI with hasSearchedStores
      setHasSearchedStores(true);
      setStores([]);
      return;
    }

    setStoreSearchLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/find-stores`, {
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
      setHasSearchedStores(true);
      
      if (result.stores && result.stores.length > 0) {
        setSelectedStore(result.stores[0]); // Auto-select first store
      }
    } catch (err) {
      setError('Error searching stores: ' + err.message);
      setStores([]);
      setHasSearchedStores(true);
    } finally {
      setStoreSearchLoading(false);
    }
  };

  const processGroceryList = async () => {
    if (!file && !textInput.trim()) {
      setError('Please select a file or enter grocery items');
      return;
    }

    if (!organizeByCategory && !selectedStore) {
      setError('Please find and select a store for aisle organization, or switch to category organization');
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

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/process-grocery-list`, {
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

  const formatGroceryList = (text) => {
    const lines = text.split('\n');
    const formattedLines = [];
    
    for (let line of lines) {
      if (line.trim() === '') continue;
      
      if (line.startsWith('## ')) {
        // Category/Aisle headers - make bold
        formattedLines.push(
          <div key={formattedLines.length} style={{ 
            fontWeight: 'bold', 
            margin: '12px 0 6px 0', 
            fontSize: '14px', 
            color: '#2c3e50' 
          }}>
            {line.replace('## ', '')}
          </div>
        );
      } else if (line.startsWith('- ')) {
        // Items - normal text
        formattedLines.push(
          <div key={formattedLines.length} style={{ 
            margin: '2px 0', 
            paddingLeft: '12px', 
            fontSize: '12px',
            color: '#2c3e50'
          }}>
            • {line.replace('- ', '')}
          </div>
        );
      } else {
        // Other text
        formattedLines.push(
          <div key={formattedLines.length} style={{ 
            margin: '2px 0', 
            fontSize: '12px',
            color: '#2c3e50'
          }}>
            {line}
          </div>
        );
      }
    }
    
    return formattedLines;
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: 'white',
      padding: '10px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '15px',
          background: '#106D15',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(16, 109, 21, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url(/baskets.png)',
            backgroundSize: '250px',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            opacity: 0.2,
            zIndex: 1
          }}></div>
          <h1 style={{ 
            color: 'white', 
            margin: '0', 
            fontSize: '1.5rem',
            fontWeight: '700',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '15px',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            position: 'relative',
            zIndex: 2
          }}>
            Aisle Finder
          </h1>
        </div>

        {/* Organization Mode Selection */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid #e9ecef'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50', fontSize: '1rem', fontWeight: '600' }}>
            Organize By:
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="organizationMode"
                checked={organizeByCategory}
                onChange={() => setOrganizeByCategory(true)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#2c3e50' }}>Category</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="organizationMode"
                checked={!organizeByCategory}
                onChange={() => setOrganizeByCategory(false)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#2c3e50' }}>Aisle</span>
            </label>
          </div>
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
              onFocus={(e) => e.target.style.borderColor = '#88C976'}
              onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
            />
            <button
              onClick={searchStores}
              disabled={storeSearchLoading}
              style={storeSearchLoading ? disabledButtonStyle : buttonStyle}
            >
              {storeSearchLoading ? 'Searching...' : 'Find Stores'}
            </button>
          </div>

          {stores.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#2c3e50' }}>
                Select Store:
              </label>
              <select
                value={selectedStore ? selectedStore.id : ''}
                onChange={(e) => {
                  const store = stores.find(s => s.id === e.target.value);
                  setSelectedStore(store);
                }}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '6px',
                  fontSize: '13px',
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

          {/* Show ZIP code validation error immediately */}
          {!storeSearchLoading && shouldShowZipError(zipCode) && (
            <div style={{ 
              marginTop: '10px', 
              padding: '6px 8px', 
              backgroundColor: '#ffe4cc', 
              borderRadius: '4px',
              border: '1px solid #ffcc99'
            }}>
              <p style={{ margin: '0', fontSize: '10px', color: '#cc6600', fontWeight: '500' }}>
                Please enter a valid ZIP code (5 digits or 5 digits-4 digits)
              </p>
            </div>
          )}

          {/* Show no stores found message after search */}
          {!storeSearchLoading && hasSearchedStores && stores.length === 0 && zipCode && isValidZipCode(zipCode) && (
            <div style={{ 
              marginTop: '10px', 
              padding: '6px 8px', 
              backgroundColor: '#ffe4cc', 
              borderRadius: '4px',
              border: '1px solid #ffcc99'
            }}>
              <p style={{ margin: '0', fontSize: '10px', color: '#cc6600', fontWeight: '500' }}>
                No stores found near ZIP code {zipCode}. Try a different ZIP code or organize by category.
              </p>
            </div>
          )}

          {selectedStore && (
            <div style={{ 
              marginTop: '10px', 
              padding: '8px 10px', 
              backgroundColor: '#d4edda', 
              borderRadius: '6px',
              border: '1px solid #c3e6cb'
            }}>
              <p style={{ margin: '0', fontSize: '12px', color: '#155724', fontWeight: '500' }}>
                Selected: <strong>{selectedStore.name}</strong> - {selectedStore.address}
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
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '10px', alignItems: 'flex-start' }}>
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
                  height: '80px',
                  padding: '8px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                  resize: 'vertical',
                  overflowY: 'auto',
                  outline: 'none',
                  transition: 'border-color 0.3s ease',
                  backgroundColor: 'white',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e1e8ed'}
              />
            </div>

            {/* File Upload Section */}
            <div style={{ flex: '1' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600', fontSize: '13px', color: '#2c3e50' }}>
                Or Upload Text File:
              </label>
              <input
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '2px solid #e1e8ed',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
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
            style={(!file && !textInput.trim()) || loading ? disabledButtonStyle : buttonStyle}
          >
            {loading ? 'Processing...' : 'Organize My List'}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#ffe4cc',
            color: '#cc6600',
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: '15px',
            fontSize: '11px',
            fontWeight: '500',
            border: '1px solid #ffcc99'
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
                style={buttonStyle}
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
                maxHeight: '200px',
                overflowY: 'auto',
                color: '#2c3e50'
              }}
            >
              {formatGroceryList(groceryList)}
            </div>
          </div>
        )}

        {/* Footer with PayPal and Bug Report */}
        <div style={{ 
          marginTop: '10px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '8px',
          fontSize: '10px'
        }}>
          <a
            href="https://www.paypal.com/donate/?business=ECTSEQ2MFSE4Y&no_recurring=0&item_name=Thanks+for+supporting+Aisle+Finder%21+Your+donation+pays+for+development+and+hosting+costs.&currency_code=USD"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #ffc439 0%, #ff7730 100%)',
              color: 'white',
              padding: '3px 8px',
              borderRadius: '3px',
              textDecoration: 'none',
              fontSize: '9px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 1px 3px rgba(255, 196, 57, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 2px 4px rgba(255, 196, 57, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0px)';
              e.target.style.boxShadow = '0 1px 3px rgba(255, 196, 57, 0.3)';
            }}
          >
            Support via PayPal
          </a>
          
          <a
            href="https://github.com/Soapsuds/aislefinder/issues"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: '#6c757d',
              color: 'white',
              padding: '3px 8px',
              borderRadius: '3px',
              textDecoration: 'none',
              fontSize: '9px',
              fontWeight: '500',
              transition: 'all 0.3s ease',
              boxShadow: '0 1px 3px rgba(108, 117, 125, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = '#5a6268';
              e.target.style.boxShadow = '0 2px 4px rgba(108, 117, 125, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#6c757d';
              e.target.style.boxShadow = '0 1px 3px rgba(108, 117, 125, 0.3)';
            }}
          >
            Report a Bug
          </a>
        </div>
      </div>
    </div>
  );
};

export default AisleFinder;