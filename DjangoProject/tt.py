import requests

# GET 请求
response = requests.get(
    "http://127.0.0.1:8000/api/getUserCheckinData/",
    params={"limit": 2, "offset": 0}
)
print(response.json())

# POST 请求
data = {
    "username": "python_user",
    "email": "python@example.com",
    "password": "mypassword"
}
response = requests.post(
    "http://127.0.0.1:8000/api/getUserCheckinData/",
    json=data
)
print(response.json())