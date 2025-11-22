      {showMockupCarousel && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-auto p-8">
            <div className="flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">Preview Your Product</h2>
                  <p className="text-white/60">Review the mockups and approve to publish to your Shopify store</p>
                </div>
                <button
                  onClick={handleRejectMockups}
                  className="w-10 h-10 flex items-center justify-center text-white/60 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Image Counter */}
              <div className="text-center">
                <p className="text-white/80">
                  Image {currentMockupIndex + 1} of {mockupImages.length}
                </p>
              </div>

              {/* Main Image Display */}
              <div className="relative aspect-square max-h-[500px] flex items-center justify-center bg-white/5 rounded-2xl overflow-hidden">
                {mockupImages[currentMockupIndex] && (
                  <>
                    {mockupImages[currentMockupIndex].type === 'mockup' ? (
                      <img
                        src={mockupImages[currentMockupIndex].src}
                        alt={`Mockup ${currentMockupIndex + 1}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <img
                        src={mockupImages[currentMockupIndex].data}
                        alt={`${mockupImages[currentMockupIndex].view} view`}
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                  </>
                )}

                {/* Navigation Arrows */}
                {mockupImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentMockupIndex(Math.max(0, currentMockupIndex - 1))}
                      disabled={currentMockupIndex === 0}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center glass-card rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow transition-all"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentMockupIndex(Math.min(mockupImages.length - 1, currentMockupIndex + 1))}
                      disabled={currentMockupIndex === mockupImages.length - 1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center glass-card rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-glow transition-all"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Strip */}
              {mockupImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {mockupImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentMockupIndex(idx)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all ${
                        currentMockupIndex === idx
                          ? 'ring-2 ring-purple-bright shadow-glow'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      {img.type === 'mockup' ? (
                        <img src={img.src} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <img src={img.data} alt={img.view} className="w-full h-full object-cover" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleRejectMockups}
                  className="flex-1 py-4 glass-button rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveMockups}
                  disabled={isGenerating}
                  className="flex-1 py-4 btn-primary rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Publishing...
                    </>
                  ) : (
                    <>
                      ✅ Approve & Publish to Shopify
                    </>
                  )}
                </button>
              </div>

              {/* Notification */}
              {notification && (
                <div className="glass-card p-4 rounded-lg bg-blue-500/20 border-blue-500/30">
                  <p className="text-sm text-blue-300 text-center">{notification}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
