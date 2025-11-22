                  <div className="bg-white/5 rounded-lg overflow-hidden">
                    {canvasImageUrl ? (
                      <img
                        src={canvasImageUrl}
                        alt="Design Preview"
                        className="w-full h-auto rounded-lg"
                        style={{ maxWidth: '100%' }}
                      />
                    ) : (
                      <div className="w-full h-64 flex items-center justify-center text-white/40">
                        Loading preview...
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Thumbnails */}
                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-4">View Options</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => setCurrentView('front')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'front' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={tFrontImg} 
                        alt="Front" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Front</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('back')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'back' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={tBackImg} 
                        alt="Back" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Back</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('leftSleeve')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'leftSleeve' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={tSleeveImg} 
                        alt="Left Sleeve" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Left Sleeve</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('rightSleeve')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'rightSleeve' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={tSleeveImg} 
                        alt="Right Sleeve" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Right Sleeve</span>
                    </button>
                    
                    <button
                      onClick={() => setCurrentView('neckLabel')}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        currentView === 'neckLabel' ? 'border-purple-bright bg-purple-bright/10 shadow-glow' : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img 
                        src={tNeckLabelImg} 
                        alt="Neck Label" 
                        className="w-full h-20 object-contain rounded mb-2" 
                      />
                      <span className="text-xs text-white/80">Neck Label</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Product Options */}
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="text-2xl font-bold text-white mb-6">Product Details</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Product Title <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        placeholder="e.g., Awesome T-Shirt Design"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-bright"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
                      <textarea
                        value={productDescription}
                        onChange={(e) => setProductDescription(e.target.value)}
                        placeholder="Describe your product..."
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-bright resize-none"
                        rows={4}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Price (USD) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        value={productPrice}
                        onChange={(e) => setProductPrice(e.target.value)}
                        placeholder="29.99"
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-bright"
                      />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6 rounded-2xl relative z-40">
                  <h3 className="text-lg font-bold text-white mb-2">Available Colors</h3>
                  <p className="text-white/60 text-sm mb-4">
                    Search and select colors ({printifyColors.length} available)
                  </p>
                  
                  {/* Selected Colors Tags */}
                  {availableColors.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {availableColors.map(color => (
                        <div 
                          key={color}
                          className="flex items-center gap-2 glass-card px-3 py-2 rounded-lg bg-purple-mid/20 border-purple-bright/30"
                        >
                          <span className="text-white text-sm">{color}</span>
                          <button
                            onClick={() => setAvailableColors(availableColors.filter(c => c !== color))}
                            className="text-white/60 hover:text-white transition-colors"
                            aria-label={`Remove ${color}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Search Input with Dropdown */}
                  <div className="relative z-50">
                    <input
                      type="text"
                      value={colorSearchTerm}
                      onChange={(e) => {
                        setColorSearchTerm(e.target.value);
                        setShowColorDropdown(e.target.value.length > 0);
                      }}
                      onFocus={() => colorSearchTerm.length > 0 && setShowColorDropdown(true)}
                      onBlur={() => setTimeout(() => setShowColorDropdown(false), 200)}
                      placeholder="Search colors..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-bright transition-all"
                    />
                    
                    {/* Search Results Dropdown */}
                    {showColorDropdown && colorSearchTerm && printifyColors.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-purple-deep/95 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden max-h-64 overflow-y-auto custom-scrollbar shadow-2xl">
                        {printifyColors
                          .filter(color => 
                            color.toLowerCase().includes(colorSearchTerm.toLowerCase()) &&
                            !availableColors.includes(color)
                          )
                          .slice(0, 10)
                          .map(color => (
                            <button
                              key={color}
                              onClick={() => {
                                setAvailableColors([...availableColors, color]);
                                setColorSearchTerm('');
                                setShowColorDropdown(false);
                              }}
                              className="w-full px-4 py-3 text-left text-white hover:bg-purple-mid/20 transition-colors border-b border-white/5 last:border-b-0"
                            >
                              {color}
                            </button>
                          ))}
                        
                        {printifyColors.filter(color => 
                          color.toLowerCase().includes(colorSearchTerm.toLowerCase()) &&
                          !availableColors.includes(color)
                        ).length === 0 && (
                          <div className="px-4 py-3 text-white/40 text-sm text-center">
                            {availableColors.some(c => c.toLowerCase() === colorSearchTerm.toLowerCase()) 
                              ? 'Color already selected'
                              : 'No colors found'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Helper text */}
                  <p className="text-white/40 text-xs mt-2">
                    {availableColors.length === 0 
                      ? 'Start typing to search and add colors'
                      : `${availableColors.length} color${availableColors.length !== 1 ? 's' : ''} selected`
                    }
                  </p>
                </div>

                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-2">Available Sizes</h3>
                  <p className="text-white/60 text-sm mb-4">Select which sizes customers can choose from</p>
                  
                  <div className="grid grid-cols-3 gap-3">
                    {sizes.map(size => (
                      <label key={size} className="flex items-center gap-2 glass-card px-4 py-3 rounded-lg cursor-pointer hover:shadow-glow transition-all">
                        <input
                          type="checkbox"
                          checked={availableSizes.includes(size)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAvailableSizes([...availableSizes, size]);
                            } else {
                              setAvailableSizes(availableSizes.filter(s => s !== size));
                            }
                          }}
                          className="w-4 h-4 text-purple-bright rounded focus:ring-purple-bright"
                        />
                        <span className="text-white/80">{size}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleSaveProduct} 
                    disabled={isGenerating}
                    className="w-full py-4 btn-primary font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Launching...
                      </>
                    ) : (
                      <>
                        🚀 Launch Product
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleBack} 
                    className="w-full py-3 glass-button rounded-xl"
                  >
                    Back to Design
                  </button>
                </div>

                {error && (
                  <div className="glass-card p-4 rounded-lg bg-red-500/20 border-red-500/30 relative">
                    <button
                      onClick={() => setError('')}
                      className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-red-300 hover:text-red-200 transition-colors"
                      title="Dismiss"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="text-sm text-red-300 pr-6">{error}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
