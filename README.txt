Fitfolio gives users the full power of their own personal wardrobe entirely in the palm of their hand!

Application Setup:
    Ensure python 3.12 is installed on the host machine,

    From Fitfolio root, create a python virtual environment:
        bash:
        python -3.12 -m venv .venv

    Activate the environment:
        bash:
        source .venv/Scripts/activate

    Install dependencies:
        bash:
        pip install -r requirements.txt
    
    Generate the database
        bash:
        python manage.py migrate

Create an admin account:
    bash:
    python manage.py createsuperuser
    
    Follow the prompts

Useful URLs
    Admin Panel:
    http://127.0.0.1:8000/admin/

    Login Page:
    http://127.0.0.1:8000/login/