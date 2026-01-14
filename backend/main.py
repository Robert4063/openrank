"""
FastAPI 应用入口
"""
import traceback
import sys
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api import search, stats, health, maxkb_proxy

app = FastAPI(
    title="OpenPulse API",
    description="GitHub开源数据搜索与可视化系统",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):

    exc_type, exc_value, exc_tb = sys.exc_info()
    tb_lines = traceback.format_exception(exc_type, exc_value, exc_tb)
    full_traceback = ''.join(tb_lines)

    print(f"\n{'='*60}")
    print(f"[ERROR] {datetime.now().isoformat()}")
    print(f"请求路径: {request.method} {request.url.path}")
    print(f"错误类型: {exc_type.__name__ if exc_type else 'Unknown'}")
    print(f"错误信息: {str(exc)}")
    print(f"堆栈跟踪:\n{full_traceback}")
    print(f"{'='*60}\n")

    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": str(exc),
            "error_type": exc_type.__name__ if exc_type else "UnknownError",
            "timestamp": datetime.now().isoformat(),
            "request_path": f"{request.method} {request.url.path}",
            "traceback": full_traceback,
            "log_details": {
                "file": tb_lines[-2].strip() if len(tb_lines) >= 2 else "Unknown",
                "line": tb_lines[-1].strip() if tb_lines else "Unknown"
            }
        }
    )

app.include_router(search.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")
app.include_router(maxkb_proxy.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "OpenPulse API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
