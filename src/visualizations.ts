// Visualizations Module
// Plotly is dynamically imported when needed to reduce initial bundle size

// Cache the Plotly import to avoid reloading
let plotlyModule: any = null;

async function getPlotly() {
    if (!plotlyModule) {
        plotlyModule = await import('plotly.js-basic-dist-min');
    }
    return plotlyModule.default;
}

interface ChartData {
    type: string;
    title: string;
    description: string;
    code: string;
}

interface VisualizationResponse {
    charts: ChartData[];
}

export class VisualizationManager {
    private container: HTMLElement;
    private generateBtn: HTMLButtonElement;
    private currentData: any[] = [];
    private currentChartIndex: number = 0;
    private charts: ChartData[] = [];

    constructor() {
        this.container = document.getElementById('visualizationsGrid') as HTMLElement;
        this.generateBtn = document.getElementById('generateVizBtn') as HTMLButtonElement;
        
        this.initializeEventListeners();
    }

    private initializeEventListeners(): void {
        this.generateBtn?.addEventListener('click', () => this.generateVisualizations());
        
        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.charts.length > 0 && document.querySelector('.viz-carousel')) {
                if (e.key === 'ArrowLeft') {
                    this.navigateCarousel('prev');
                } else if (e.key === 'ArrowRight') {
                    this.navigateCarousel('next');
                }
            }
        });

        // Add touch swipe support for mobile
        let touchStartX = 0;
        let touchEndX = 0;
        
        const handleSwipe = () => {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    this.navigateCarousel('next');
                } else {
                    this.navigateCarousel('prev');
                }
            }
        };

        document.addEventListener('touchstart', (e) => {
            if (this.charts.length > 0 && e.target instanceof Element && e.target.closest('.viz-carousel')) {
                touchStartX = e.changedTouches[0].screenX;
            }
        });

        document.addEventListener('touchend', (e) => {
            if (this.charts.length > 0 && e.target instanceof Element && e.target.closest('.viz-carousel')) {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            }
        });
    }

    public setData(data: any[]): void {
        this.currentData = data;
    }

    private async generateVisualizations(): Promise<void> {
        if (!this.currentData || this.currentData.length === 0) {
            this.showError('Please convert some data first in the Converter tab');
            return;
        }

        try {
            this.generateBtn.disabled = true;
            this.generateBtn.innerHTML = `
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                Generating...
            `;

            // Call backend to generate visualization recommendations
            const response = await fetch('http://localhost:8000/generate-visualizations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: JSON.stringify(this.currentData)
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate visualizations');
            }

            const result: VisualizationResponse = await response.json();

            // Store charts for carousel
            this.charts = result.charts;
            this.currentChartIndex = 0;

            // Clear container and create carousel
            this.container.innerHTML = '';
            this.createCarousel();

            // Render all charts
            for (let i = 0; i < result.charts.length; i++) {
                await this.renderChart(result.charts[i], i);
            }

            // Show first chart
            this.showChart(0);

        } catch (error) {
            console.error('Error generating visualizations:', error);
            this.showError('Failed to generate visualizations. Please try again.');
        } finally {
            this.generateBtn.disabled = false;
            this.generateBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate Visualizations
            `;
        }
    }

    private createCarousel(): void {
        // Get the parent container
        const parentContainer = this.container.parentElement;
        
        // Remove any existing dots wrapper before creating new one
        const existingDotsWrapper = parentContainer?.querySelector('.viz-carousel-dots-wrapper');
        if (existingDotsWrapper) {
            existingDotsWrapper.remove();
        }
        
        this.container.innerHTML = `
            <div class="viz-carousel">
                <div class="viz-carousel-container">
                    <div class="viz-carousel-slides" id="vizCarouselSlides"></div>
                </div>
            </div>
        `;
        
        // Add dots container with navigation arrows
        const dotsWrapper = document.createElement('div');
        dotsWrapper.className = 'viz-carousel-dots-wrapper';
        dotsWrapper.innerHTML = `
            <button class="viz-nav-arrow viz-nav-arrow-left" id="vizCarouselPrev" aria-label="Previous chart">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>
            <div class="viz-carousel-dots" id="vizCarouselDots"></div>
            <button class="viz-nav-arrow viz-nav-arrow-right" id="vizCarouselNext" aria-label="Next chart">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        `;
        parentContainer?.appendChild(dotsWrapper);
        
        // Add click handlers for arrows
        const prevBtn = document.getElementById('vizCarouselPrev');
        const nextBtn = document.getElementById('vizCarouselNext');
        prevBtn?.addEventListener('click', () => this.navigateCarousel('prev'));
        nextBtn?.addEventListener('click', () => this.navigateCarousel('next'));
    }

    private navigateCarousel(direction: 'prev' | 'next'): void {
        if (direction === 'prev') {
            this.currentChartIndex = (this.currentChartIndex - 1 + this.charts.length) % this.charts.length;
        } else {
            this.currentChartIndex = (this.currentChartIndex + 1) % this.charts.length;
        }
        this.showChart(this.currentChartIndex);
    }

    private showChart(index: number): void {
        const slides = document.querySelectorAll('.viz-slide');
        const dots = document.querySelectorAll('.viz-dot');

        slides.forEach((slide, i) => {
            if (i === index) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });

        dots.forEach((dot, i) => {
            if (i === index) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });

        // Update chart size when shown
        const chartId = `chart-${index}`;
        const chartElement = document.getElementById(chartId);
        if (chartElement) {
            // Dynamically load Plotly only when needed
            getPlotly().then(Plotly => {
                Plotly.Plots.resize(chartElement);
            });
        }
    }

    private async renderChart(chart: ChartData, index: number): Promise<void> {
        try {
            const slidesContainer = document.getElementById('vizCarouselSlides');
            const dotsContainer = document.getElementById('vizCarouselDots');
            
            if (!slidesContainer || !dotsContainer) return;

            // Create slide
            const slide = document.createElement('div');
            slide.className = 'viz-slide';
            if (index === 0) slide.classList.add('active');

            const chartCard = document.createElement('div');
            chartCard.className = 'viz-card';

            // Create card inner container for flip effect
            const cardInner = document.createElement('div');
            cardInner.className = 'viz-card-inner';

            // Front face - Chart
            const cardFront = document.createElement('div');
            cardFront.className = 'viz-card-face viz-card-front';
            
            const chartBody = document.createElement('div');
            chartBody.className = 'viz-card-body';
            chartBody.id = `chart-${index}`;
            
            cardFront.appendChild(chartBody);

            // Back face - Information
            const cardBack = document.createElement('div');
            cardBack.className = 'viz-card-face viz-card-back';
            cardBack.innerHTML = `
                <div class="viz-info-content">
                    <h4 class="viz-info-title">${chart.title}</h4>
                    <p class="viz-info-description">${chart.description}</p>
                    <button class="viz-flip-back-btn">View Chart</button>
                </div>
            `;

            // Flip on click
            cardInner.addEventListener('click', (e) => {
                // Don't flip if clicking plotly controls
                const target = e.target as HTMLElement;
                if (target.closest('.modebar') || target.closest('.viz-flip-back-btn')) {
                    if (target.closest('.viz-flip-back-btn')) {
                        cardInner.classList.remove('flipped');
                    }
                    return;
                }
                cardInner.classList.toggle('flipped');
            });

            cardInner.appendChild(cardFront);
            cardInner.appendChild(cardBack);
            chartCard.appendChild(cardInner);
            slide.appendChild(chartCard);
            slidesContainer.appendChild(slide);

            // Create dot
            const dot = document.createElement('button');
            dot.className = 'viz-dot';
            if (index === 0) dot.classList.add('active');
            dot.setAttribute('aria-label', `Go to chart ${index + 1}`);
            dot.addEventListener('click', () => {
                this.currentChartIndex = index;
                this.showChart(index);
            });
            dotsContainer.appendChild(dot);

            // Execute the visualization code
            const execResponse = await fetch('http://localhost:8000/execute-visualization', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: chart.code,
                    data: this.currentData
                })
            });

            if (!execResponse.ok) {
                throw new Error('Failed to execute visualization code');
            }

            const execResult = await execResponse.json();

            if (execResult.success && execResult.data) {
                // Check if mobile
                const isMobile = window.innerWidth <= 768;
                
                // Render using Plotly with improved layout
                const layout = {
                    ...execResult.data.layout,
                    autosize: true,
                    margin: isMobile 
                        ? { l: 40, r: 20, t: 40, b: 40 }
                        : { l: 50, r: 50, t: 50, b: 50 },
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: {
                        color: '#d4d4d4',
                        size: isMobile ? 10 : 12
                    },
                    xaxis: {
                        ...execResult.data.layout?.xaxis,
                        tickfont: { size: isMobile ? 9 : 11 }
                    },
                    yaxis: {
                        ...execResult.data.layout?.yaxis,
                        tickfont: { size: isMobile ? 9 : 11 }
                    },
                    legend: {
                        ...execResult.data.layout?.legend,
                        font: { size: isMobile ? 9 : 11 }
                    }
                };

                const config = {
                    responsive: true,
                    displayModeBar: !isMobile,
                    displaylogo: false,
                    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d', 'toImage'],
                    modeBarButtonsToAdd: isMobile ? [] : [{
                        name: 'Download as PNG',
                        icon: undefined, // Will be set after Plotly loads
                        click: async function(gd: any) {
                            const Plotly = await getPlotly();
                            Plotly.downloadImage(gd, {
                                format: 'png',
                                width: 1200,
                                height: 800,
                                filename: chart.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
                            });
                        }
                    }]
                };

                // Dynamically load Plotly and render the chart
                const Plotly = await getPlotly();
                
                // Update icon after Plotly loads
                if (!isMobile && config.modeBarButtonsToAdd.length > 0) {
                    config.modeBarButtonsToAdd[0].icon = Plotly.Icons.camera;
                }
                
                await Plotly.newPlot(chartBody.id, execResult.data.data, layout, config);
            } else {
                throw new Error('Invalid visualization data');
            }

        } catch (error) {
            console.error('Error rendering chart:', error);
            // Show error in slide
            const slidesContainer = document.getElementById('vizCarouselSlides');
            if (slidesContainer) {
                const errorSlide = document.createElement('div');
                errorSlide.className = 'viz-slide';
                if (index === 0) errorSlide.classList.add('active');
                
                errorSlide.innerHTML = `
                    <div class="viz-card viz-error">
                        <div class="viz-card-header">
                            <h4 class="viz-card-title">${chart.title}</h4>
                            <p class="viz-card-description error">Failed to render this visualization</p>
                        </div>
                    </div>
                `;
                slidesContainer.appendChild(errorSlide);
            }
        }
    }

    private showError(message: string): void {
        this.container.innerHTML = `
            <div class="viz-error-message">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>${message}</p>
            </div>
        `;
    }
}
