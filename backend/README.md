# Backend setup

Install dependencies in this order from the `backend` directory:

```powershell
pip install -r requirements.txt
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu126
```

The requirements file intentionally does not install Torch. Always install the CUDA build after the general requirements so a later requirements installation cannot replace it with a CPU-only build.

Verify CUDA is available:

```powershell
python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
```