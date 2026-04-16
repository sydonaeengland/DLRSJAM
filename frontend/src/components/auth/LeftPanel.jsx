import coatOfArms from "../../assets/coat-of-arms.png";
import { BRAND } from "../../config/theme";

export default function LeftPanel({ slides, current, fading, goToSlide, step, totalSteps }) {
  const slide = slides[current ?? 0];
  const isStepMode = step !== undefined;

  return (
    <div className="hidden lg:block lg:w-[52%] relative overflow-hidden flex-shrink-0">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${slide.image})`,
          opacity: fading ? 0 : 1,
          transition: "opacity 0.6s ease",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(10,20,60,0.65) 0%, rgba(10,20,60,0.15) 45%, rgba(10,20,60,0.85) 100%)",
        }}
      />
      <div className="relative z-10 h-full flex flex-col justify-between p-10">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <img src={coatOfArms} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
          <div>
            <p className="text-white/90 text-sm font-semibold tracking-wide leading-none">
              Tax Administration Jamaica
            </p>
            <p className="text-white/50 text-xs mt-0.5">Driver's Licence Renewal System</p>
          </div>
        </div>

        {/* Slide text */}
        <div style={{ opacity: fading ? 0 : 1, transition: "opacity 0.6s ease" }}>
          {isStepMode && (
            <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-3">
              Step {step} of {totalSteps}
            </p>
          )}
          <h1
            className="text-white font-bold leading-tight max-w-sm"
            style={{ fontSize: "clamp(28px, 3vw, 44px)", whiteSpace: "pre-line" }}
          >
            {slide.headline}
          </h1>
          <p className="text-white/65 text-sm mt-4 max-w-xs leading-relaxed">
            {slide.subtext}
          </p>

          {/* Dots (slideshow mode) or bars (step mode) */}
          <div className="flex items-center gap-2 mt-7">
            {isStepMode ? (
              Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "28px", height: "3px", borderRadius: "99px",
                    backgroundColor:
                      i + 1 < step ? BRAND.gold : i + 1 === step ? "white" : "rgba(255,255,255,0.2)",
                    transition: "background-color 0.3s ease",
                  }}
                />
              ))
            ) : (
              slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide?.(i)}
                  aria-label={`Slide ${i + 1}`}
                  style={{
                    width: i === current ? "28px" : "8px",
                    height: "8px", borderRadius: "99px",
                    backgroundColor: i === current ? BRAND.gold : "rgba(255,255,255,0.35)",
                    border: "none", padding: 0, cursor: "pointer",
                    transition: "all 0.35s ease",
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}