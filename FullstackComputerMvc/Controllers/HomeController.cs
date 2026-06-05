using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using FullstackComputerMvc.Models;

namespace FullstackComputerMvc.Controllers;

public class HomeController : Controller
{
    #region Clean MVC Routes

    [HttpGet("/")]
    [HttpGet("/Home/Index")]
    public IActionResult Index()
    {
        return View();
    }

    [HttpGet("/Home/AboutUs")]
    public IActionResult AboutUs()
    {
        return View();
    }

    [HttpGet("/Home/AdminPage")]
    public IActionResult AdminPage()
    {
        return View();
    }

    [HttpGet("/Home/AppleEdu")]
    public IActionResult AppleEdu()
    {
        return View();
    }

    [HttpGet("/Home/BuildPc")]
    public IActionResult BuildPc()
    {
        return View();
    }

    [HttpGet("/Home/Business")]
    public IActionResult Business()
    {
        return View();
    }

    [HttpGet("/Home/DetailProduct")]
    public IActionResult DetailProduct()
    {
        return View();
    }

    [HttpGet("/Home/EditProduct")]
    public IActionResult EditProduct()
    {
        return View();
    }

    [HttpGet("/Home/Hotline")]
    public IActionResult Hotline()
    {
        return View();
    }

    [HttpGet("/Home/Login")]
    public IActionResult Login()
    {
        return View();
    }

    [HttpGet("/Home/Post")]
    public IActionResult Post()
    {
        return View();
    }

    [HttpGet("/Home/Product")]
    public IActionResult Product()
    {
        return View();
    }

    [HttpGet("/Home/Promo")]
    public IActionResult Promo()
    {
        return View();
    }

    [HttpGet("/Home/Register")]
    public IActionResult Register()
    {
        return View();
    }

    [HttpGet("/Home/Shopping")]
    public IActionResult Shopping()
    {
        return View();
    }

    [HttpGet("/Home/TechNews")]
    public IActionResult TechNews()
    {
        return View();
    }

    #endregion

    #region URL Redirects for old .html extensions

    [HttpGet("/index.html")]
    public IActionResult RedirectIndex() => RedirectPermanent("/");

    [HttpGet("/pages/aboutus.html")]
    public IActionResult RedirectAboutUs() => RedirectPermanent("/Home/AboutUs");

    [HttpGet("/pages/adminpage.html")]
    public IActionResult RedirectAdminPage() => RedirectPermanent("/Home/AdminPage");

    [HttpGet("/pages/appleedu.html")]
    public IActionResult RedirectAppleEdu() => RedirectPermanent("/Home/AppleEdu");

    [HttpGet("/pages/builpc.html")]
    public IActionResult RedirectBuildPc() => RedirectPermanent("/Home/BuildPc");

    [HttpGet("/pages/bussiness.html")]
    public IActionResult RedirectBusiness() => RedirectPermanent("/Home/Business");

    [HttpGet("/pages/detailproduct.html")]
    public IActionResult RedirectDetailProduct()
    {
        var queryString = Request.QueryString.Value;
        return RedirectPermanent($"/Home/DetailProduct{queryString}");
    }

    [HttpGet("/pages/editproduct.html")]
    public IActionResult RedirectEditProduct()
    {
        var queryString = Request.QueryString.Value;
        return RedirectPermanent($"/Home/EditProduct{queryString}");
    }

    [HttpGet("/pages/hotline.html")]
    public IActionResult RedirectHotline() => RedirectPermanent("/Home/Hotline");

    [HttpGet("/pages/login.html")]
    public IActionResult RedirectLogin()
    {
        var queryString = Request.QueryString.Value;
        return RedirectPermanent($"/Home/Login{queryString}");
    }

    [HttpGet("/pages/post.html")]
    public IActionResult RedirectPost() => RedirectPermanent("/Home/Post");

    [HttpGet("/pages/product.html")]
    public IActionResult RedirectProduct() => RedirectPermanent("/Home/Product");

    [HttpGet("/pages/promo.html")]
    public IActionResult RedirectPromo() => RedirectPermanent("/Home/Promo");

    [HttpGet("/pages/register.html")]
    public IActionResult RedirectRegister() => RedirectPermanent("/Home/Register");

    [HttpGet("/pages/shopping.html")]
    public IActionResult RedirectShopping() => RedirectPermanent("/Home/Shopping");

    [HttpGet("/pages/technews.html")]
    public IActionResult RedirectTechNews() => RedirectPermanent("/Home/TechNews");

    #endregion

    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public IActionResult Error()
    {
        return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
    }
}
