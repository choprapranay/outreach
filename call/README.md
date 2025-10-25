## Running

Start the server:
```bash
python app.py
```

Or with uvicorn:
```bash
uvicorn app:app --reload
```

The server will be available at `http://localhost:5000`

Make a test call:
```bash
curl -X POST http://localhost:5000/make-call
```
