import base64
import requests


from grocery_organizer.src.core.models import FullProduct
from grocery_organizer.src.core.secrets import CLIENT_SECRET

class KrogerAPI:

    AUTH_URL = 'https://api.kroger.com/v1/connect/oauth2/token'
    PRODUCT_URL = 'https://api.kroger.com/v1/products'
    CLIENT_ID = 'aislefinder4000-bbc6d2p3'

    #TODO need to take location as an option
    def __init__(self, store_id: str = "01400943"):
        self.store_id = store_id

    def get_auth_token(self):
        auth_code = self.CLIENT_ID + ':' + CLIENT_SECRET

        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + base64.b64encode(auth_code.encode('utf-8')).decode('utf-8')
        }
        data = {'grant_type': 'client_credentials', 'scope': 'product.compact'}

        response = requests.post(self.AUTH_URL, headers = headers, data=data)

        token = response.json()['access_token']
        return token

    def find_product(self, product_name):
        #TODO don't get everytime
        #Prepare API Request
        token = self.get_auth_token()
        headers = {'Authorization': 'Bearer ' + token, 'Cache-Control': 'no-cache'}
        payload = {'filter.term': product_name, 'filter.locationId': self.store_id}
        response = requests.get(self.PRODUCT_URL, headers=headers, params=payload)

        #TODO response error checking
        product_data = response.json()['data'][0]

        #extract response into object
        found_product = FullProduct(
            product_name,
            product_data['description'],
            product_data['categories'][0],
            product_data['aisleLocations'][0]['number']
        )

        return found_product