import React, { useState } from 'react';

const AisleFinder = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [groceryList, setGroceryList] = useState('');
  const [error, setError] = useState('');

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

  const processGroceryList = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('output_format', 'aisle');
      formData.append('store', '4500S Smiths');

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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '30px' }}>
        Aisle Finder
      </h1>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Upload Grocery List (Text File):
          </label>
          <input
            type="file"
            accept=".txt"
            onChange={handleFileUpload}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '400px'
            }}
          />
        </div>
        
        {file && (
          <p style={{ color: '#27ae60', fontSize: '14px' }}>
            Selected: {file.name}
          </p>
        )}
      </div>

      <button
        onClick={processGroceryList}
        disabled={!file || loading}
        style={{
          backgroundColor: !file || loading ? '#95a5a6' : '#3498db',
          color: 'white',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '4px',
          cursor: !file || loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Processing...' : 'Process Grocery List'}
      </button>

      {error && (
        <div style={{
          backgroundColor: '#e74c3c',
          color: 'white',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {groceryList && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: '0', color: '#2c3e50' }}>Organized Grocery List:</h3>
            <button
              onClick={copyToClipboard}
              style={{
                backgroundColor: '#27ae60',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Copy to Clipboard
            </button>
          </div>
          
          <pre style={{
            backgroundColor: '#f8f9fa',
            padding: '15px',
            borderRadius: '4px',
            border: '1px solid #e9ecef',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {groceryList}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AisleFinder;